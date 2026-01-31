import { useCallback, useRef } from 'react';
import { useRecordingStore } from '../stores/recording.store';
import { useSessionStore } from '../stores/session.store';
import { useCameraStore } from '../stores/camera.store';
import { useMediaRecorder } from './useMediaRecorder';
import { useQrScanner } from './useQrScanner';
import { useBarcodeScanner } from './useBarcodeScanner';
import { orderApi, videoApi, inventoryApi, productApi } from '../services/api';
import type { ExpandedOrderItem, VideoType } from '@packing/shared';

interface UseRecordingSessionOptions {
  type: VideoType;
  cam1Stream: MediaStream | null;
  onDuplicateFound?: (shippingCode: string) => Promise<boolean>; // returns true = proceed
}

export function useRecordingSession({ type, cam1Stream, onDuplicateFound }: UseRecordingSessionOptions) {
  const store = useRecordingStore();
  const sessionStore = useSessionStore();
  const cameraStore = useCameraStore();
  const pendingQrRef = useRef<string | null>(null);

  const { isRecording, duration, start: startRecorder, stop: stopRecorder } = useMediaRecorder({
    stream: cam1Stream,
  });

  // Handle QR code detected from Cam2
  const handleQrDetected = useCallback(
    async (code: string) => {
      const currentState = useRecordingStore.getState().state;

      if (currentState === 'SAVING' || currentState === 'CHECK_DUPLICATE') return;

      if (currentState === 'IDLE') {
        await startNewRecording(code);
      } else if (currentState === 'RECORDING') {
        // New QR during recording → save current, then check duplicate, then start new
        pendingQrRef.current = code;
        await saveCurrentRecording();
        // After saving, handle the pending QR
        await handlePendingQr();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cam1Stream]
  );

  // Handle barcode detected from Cam3
  const handleBarcodeDetected = useCallback(
    async (barcode: string) => {
      const { state, orderItems } = useRecordingStore.getState();
      if (state !== 'RECORDING') return;

      try {
        const res = await productApi.getByBarcode(barcode);
        const product = res.data;
        if (!product) return;

        // Check if this product is in the order's expanded items
        const matchingItem = orderItems.find((item) => item.productId === product.id);
        if (matchingItem) {
          useRecordingStore.getState().incrementScan(product.id);
        } else {
          // Foreign product - still track it
          useRecordingStore.getState().incrementScan('FOREIGN:' + product.id);
        }
      } catch (err) {
        console.error('Barcode lookup failed:', err);
      }
    },
    []
  );

  // Start QR scanner on Cam2
  useQrScanner({
    deviceId: cameraStore.cam2DeviceId,
    onDetected: handleQrDetected,
    enabled: true,
  });

  // Start barcode scanner on Cam3
  useBarcodeScanner({
    deviceId: cameraStore.cam3DeviceId,
    onDetected: handleBarcodeDetected,
    enabled: useRecordingStore.getState().state === 'RECORDING',
  });

  async function startNewRecording(shippingCode: string) {
    store.setState('CHECK_DUPLICATE');

    // Check for duplicate
    try {
      const res = await videoApi.checkDuplicate(shippingCode, type);
      if (res.data.data && res.data.data.length > 0) {
        if (onDuplicateFound) {
          const proceed = await onDuplicateFound(shippingCode);
          if (!proceed) {
            store.setState('IDLE');
            return;
          }
        }
      }
    } catch {
      // If check fails, proceed anyway
    }

    // Fetch order info
    try {
      const orderRes = await orderApi.getByShippingCode(shippingCode);
      const order = orderRes.data;

      // Expand combo items
      const expandedItems: ExpandedOrderItem[] = [];
      for (const item of order.items || []) {
        const product = item.product;
        if (!product) continue;

        if (product.isCombo && product.components) {
          for (const comp of product.components) {
            const existing = expandedItems.find((e) => e.productId === comp.component.id);
            if (existing) {
              existing.requiredQty += item.quantity * comp.quantity;
            } else {
              expandedItems.push({
                productId: comp.component.id,
                productName: comp.component.name,
                sku: comp.component.sku,
                barcode: comp.component.barcode,
                requiredQty: item.quantity * comp.quantity,
                parentComboName: product.name,
                isComboComponent: true,
              });
            }
          }
        } else {
          const existing = expandedItems.find((e) => e.productId === product.id);
          if (existing) {
            existing.requiredQty += item.quantity;
          } else {
            expandedItems.push({
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              barcode: product.barcode || null,
              requiredQty: item.quantity,
              isComboComponent: false,
            });
          }
        }
      }

      store.setShippingCode(shippingCode);
      store.setOrderItems(expandedItems);
      store.resetScanCounts();
    } catch {
      // Order not found - still allow recording
      store.setShippingCode(shippingCode);
      store.setOrderItems([]);
      store.resetScanCounts();
    }

    // Start recording
    startRecorder();
    store.setState('RECORDING');
  }

  async function saveCurrentRecording() {
    const { currentShippingCode, scanCounts, orderItems } = useRecordingStore.getState();
    store.setState('SAVING');

    try {
      const { blob, duration: dur } = await stopRecorder();

      if (blob.size === 0) {
        store.reset();
        return;
      }

      // Save video file locally via IPC
      const arrayBuffer = await blob.arrayBuffer();
      const fileName = `${type.toLowerCase()}_${currentShippingCode}_${Date.now()}.webm`;
      await window.electronAPI.saveVideo(arrayBuffer, fileName);

      // Get machine name
      const machineName = await window.electronAPI.getMachineName();
      const staffId = localStorage.getItem('staffId') || '';

      // Build scanned items for API
      const scannedItems = Object.entries(scanCounts)
        .filter(([key]) => !key.startsWith('FOREIGN:'))
        .map(([productId, scannedQty]) => ({ productId, scannedQty }));

      // Create video record on server
      await videoApi.create({
        shippingCode: currentShippingCode,
        staffId,
        type,
        status: 'COMPLETED',
        duration: dur,
        fileName,
        machineName,
        scannedItems,
      });

      // Deduct/return inventory
      if (type === 'PACKING') {
        await inventoryApi.packingComplete({
          shippingCode: currentShippingCode,
          items: orderItems.map((item) => ({
            productId: item.productId,
            quantity: item.requiredQty,
          })),
        });
      } else if (type === 'RETURN') {
        await inventoryApi.returnComplete({
          shippingCode: currentShippingCode,
          items: scannedItems.map((si) => ({
            productId: si.productId,
            quantity: si.scannedQty,
            quality: 'GOOD', // default, overridden by return flow
          })),
        });
      }

      // Add to session cache
      sessionStore.addEntry({
        shippingCode: currentShippingCode,
        status: 'completed',
        duration: dur,
        type,
        time: new Date().toLocaleTimeString('vi-VN'),
      });
    } catch (err) {
      console.error('Save recording failed:', err);
      sessionStore.addEntry({
        shippingCode: currentShippingCode,
        status: 'failed',
        duration: 0,
        type,
        time: new Date().toLocaleTimeString('vi-VN'),
      });
    }

    store.reset();
  }

  async function handlePendingQr() {
    const qr = pendingQrRef.current;
    pendingQrRef.current = null;
    if (qr) {
      await startNewRecording(qr);
    }
  }

  // Manual stop (Enter/Space)
  const stopManually = useCallback(async () => {
    const currentState = useRecordingStore.getState().state;
    if (currentState !== 'RECORDING') return;
    await saveCurrentRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isRecording,
    duration,
    stopManually,
    state: store.state,
    shippingCode: store.currentShippingCode,
    orderItems: store.orderItems,
    scanCounts: store.scanCounts,
  };
}
