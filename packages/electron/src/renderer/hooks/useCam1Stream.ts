import { useState, useEffect } from 'react';
import { useCameraStore } from '../stores/camera.store';

export function useCam1Stream() {
  const cam1DeviceId = useCameraStore((s) => s.cam1DeviceId);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!cam1DeviceId) {
      setStream(null);
      return;
    }

    let active = true;
    let currentStream: MediaStream | null = null;

    console.log('[useCam1Stream] Requesting camera:', cam1DeviceId);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          deviceId: { exact: cam1DeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24 },
        },
        audio: false,
      })
      .then((s) => {
        console.log('[useCam1Stream] Camera opened successfully, active tracks:', s.getTracks().length);
        if (active) {
          currentStream = s;
          setStream(s);
        } else {
          console.log('[useCam1Stream] Component unmounted before stream ready, stopping tracks');
          s.getTracks().forEach((t) => t.stop());
        }
      })
      .catch((err) => {
        console.error('[useCam1Stream] Failed to open Cam1:', err);
        if (active) setStream(null);
      });

    return () => {
      console.log('[useCam1Stream] Cleanup: stopping tracks');
      active = false;
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop());
      }
      // Don't set stream to null immediately - let next effect handle it
    };
  }, [cam1DeviceId]);

  return stream;
}
