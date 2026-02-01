import { useCallback, useRef } from 'react';
import { useRecordingStore } from '../stores/recording.store';
import { useSessionStore } from '../stores/session.store';
import { useCameraStore } from '../stores/camera.store';
import { useProductCacheStore } from '../stores/product-cache.store';
import { useMediaRecorder } from './useMediaRecorder';
import { useQrScanner } from './useQrScanner';
import { useSounds } from './useSounds';
import { orderApi, videoApi, inventoryApi } from '../services/api';
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
  const productCache = useProductCacheStore();
  const pendingQrRef = useRef<string | null>(null);
  const { play: playSound } = useSounds();

  const { isRecording, duration, start: startRecorder, stop: stopRecorder } = useMediaRecorder({
    stream: cam1Stream,
  });

  // Handle QR code detected from Cam2 (camera)
  const handleQrDetected = useCallback(
    async (code: string) => {
      // QR from camera is always treated as shipping code
      await handleShippingCode(code);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cam1Stream]
  );

  // Handle scanner gun input (could be barcode or shipping code)
  const handleScannerInput = useCallback(
    async (code: string) => {
      const currentState = useRecordingStore.getState().state;
      if (currentState === 'SAVING' || currentState === 'CHECK_DUPLICATE') return;

      // Try product lookup from local cache (instant, no API call)
      const product = productCache.getByBarcode(code);

      if (product) {
        // It's a product barcode
        if (currentState !== 'RECORDING') return; // Ignore product scan when not recording

        const { orderItems, scanCounts } = useRecordingStore.getState();
        const matchingItem = orderItems.find((item) => item.productId === product.id);

        if (type === 'RETURN') {
          // For returns: add individual entry
          useRecordingStore.getState().addReturnScanEntry({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            barcode: product.barcode || null,
            imageUrl: product.imageUrl || null,
            quality: 'GOOD',
          });
          useRecordingStore.getState().incrementScan(product.id);
          playSound('scanSuccess');
        } else {
          // For packing: increment scan count
          if (matchingItem) {
            const currentScanned = scanCounts[product.id] || 0;
            if (currentScanned >= matchingItem.requiredQty) {
              // Quét thừa — đã đủ rồi → đếm vào FOREIGN để hiện dòng riêng
              useRecordingStore.getState().incrementScan('FOREIGN:' + product.id);
              playSound('scanError');
              useRecordingStore.getState().setForeignAlert({
                productName: product.name,
                sku: product.sku,
                reason: 'excess',
              });
            } else {
              useRecordingStore.getState().incrementScan(product.id);
              playSound('scanSuccess');
            }
          } else {
            // SP lạ — không thuộc đơn hàng
            useRecordingStore.getState().incrementScan('FOREIGN:' + product.id);
            playSound('scanError');
            useRecordingStore.getState().setForeignAlert({
              productName: product.name,
              sku: product.sku,
              reason: 'foreign',
            });
          }
        }
      } else {
        // Not a product barcode → treat as shipping code
        await handleShippingCode(code);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cam1Stream, type]
  );

  // Handle shipping code (from QR camera or scanner gun)
  async function handleShippingCode(code: string) {
    const currentState = useRecordingStore.getState().state;
    if (currentState === 'SAVING' || currentState === 'CHECK_DUPLICATE') return;

    if (currentState === 'IDLE') {
      await startNewRecording(code);
    } else if (currentState === 'RECORDING') {
      // New shipping code during recording → save current, then start new
      pendingQrRef.current = code;
      await saveCurrentRecording();
      await handlePendingQr();
    }
  }

  // Start QR scanner on Cam2
  const { videoRef: qrVideoRef, resetLastCode } = useQrScanner({
    deviceId: cameraStore.cam2DeviceId,
    onDetected: handleQrDetected,
    enabled: true,
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

        if (product.isCombo && product.comboComponents) {
          for (const comp of product.comboComponents) {
            const existing = expandedItems.find((e) => e.productId === comp.component.id);
            if (existing) {
              existing.requiredQty += item.quantity * comp.quantity;
            } else {
              expandedItems.push({
                productId: comp.component.id,
                productName: comp.component.name,
                sku: comp.component.sku,
                barcode: comp.component.barcode,
                imageUrl: comp.component.imageUrl || null,
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
              imageUrl: product.imageUrl || null,
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
    playSound('recordStart');
  }

  async function saveCurrentRecording() {
    const { currentShippingCode, scanCounts, orderItems, returnScanEntries } =
      useRecordingStore.getState();
    store.setState('SAVING');
    playSound('recordStop');

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
        // Chỉ trừ tồn kho theo số lượng thực tế đã quét, không phải requiredQty
        const scannedItems = orderItems
          .filter((item) => (scanCounts[item.productId] || 0) > 0)
          .map((item) => ({
            productId: item.productId,
            quantity: scanCounts[item.productId] || 0,
          }));
        if (scannedItems.length > 0) {
          await inventoryApi.packingComplete({
            shippingCode: currentShippingCode,
            items: scannedItems,
          });
        }
      } else if (type === 'RETURN') {
        // Group return entries by productId + quality
        const grouped = new Map<string, { productId: string; quantity: number; quality: 'GOOD' | 'BAD' }>();
        for (const entry of returnScanEntries) {
          const key = `${entry.productId}:${entry.quality}`;
          const existing = grouped.get(key);
          if (existing) {
            existing.quantity++;
          } else {
            grouped.set(key, { productId: entry.productId, quantity: 1, quality: entry.quality });
          }
        }
        if (grouped.size > 0) {
          await inventoryApi.returnComplete({
            shippingCode: currentShippingCode,
            items: Array.from(grouped.values()),
          });
        }
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
    resetLastCode();
  }

  async function handlePendingQr() {
    const qr = pendingQrRef.current;
    pendingQrRef.current = null;
    if (qr) {
      await startNewRecording(qr);
    }
  }

  // Manual stop (Escape key)
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
    handleScannerInput,
    qrVideoRef,
    state: store.state,
    shippingCode: store.currentShippingCode,
    orderItems: store.orderItems,
    scanCounts: store.scanCounts,
    returnScanEntries: store.returnScanEntries,
  };
}
