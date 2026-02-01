import { useEffect, useRef, useCallback } from 'react';
import QrScanner from 'qr-scanner';

interface UseQrScannerOptions {
  deviceId: string;
  onDetected: (code: string) => void;
  enabled?: boolean;
}

export function useQrScanner({ deviceId, onDetected, enabled = true }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastCodeRef = useRef<string>('');
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const handleDetected = useCallback((result: QrScanner.ScanResult) => {
    const text = result.data;
    if (!text) return;
    // Chỉ trigger khi QR code khác với code trước đó
    if (text === lastCodeRef.current) return;
    lastCodeRef.current = text;
    onDetectedRef.current(text);
  }, []);

  useEffect(() => {
    if (!deviceId || !enabled) return;

    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      handleDetected,
      {
        maxScansPerSecond: 25,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
      }
    );
    scannerRef.current = scanner;

    scanner.setCamera(deviceId).then(() => {
      scanner.start().catch((err: unknown) => console.error('QR scanner start failed:', err));
    }).catch((err: unknown) => console.error('QR scanner setCamera failed:', err));

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [deviceId, enabled, handleDetected]);

  const resetLastCode = useCallback(() => {
    lastCodeRef.current = '';
  }, []);

  return { videoRef, resetLastCode };
}
