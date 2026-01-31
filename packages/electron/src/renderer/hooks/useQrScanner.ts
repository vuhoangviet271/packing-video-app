import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface UseQrScannerOptions {
  deviceId: string;
  onDetected: (code: string) => void;
  enabled?: boolean;
}

export function useQrScanner({ deviceId, onDetected, enabled = true }: UseQrScannerOptions) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastTimeRef = useRef<number>(0);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const handleDetected = useCallback((text: string) => {
    const now = Date.now();
    // Debounce: ignore same code within 2 seconds
    if (text === lastCodeRef.current && now - lastTimeRef.current < 2000) return;
    lastCodeRef.current = text;
    lastTimeRef.current = now;
    onDetectedRef.current(text);
  }, []);

  useEffect(() => {
    if (!deviceId || !enabled) return;

    const containerId = 'qr-scanner-' + deviceId.slice(0, 8);
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '300px';
      container.style.height = '300px';
      document.body.appendChild(container);
    }

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { deviceId: { exact: deviceId } },
        { fps: 5, qrbox: { width: 250, height: 250 } },
        handleDetected,
        () => {} // ignore errors (no QR found in frame)
      )
      .catch((err) => console.error('QR scanner start failed:', err));

    return () => {
      try {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
            container?.remove();
          });
      } catch {
        scannerRef.current = null;
        container?.remove();
      }
    };
  }, [deviceId, enabled, handleDetected]);
}
