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

    navigator.mediaDevices
      .getUserMedia({
        video: {
          deviceId: { exact: cam1DeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then((s) => {
        if (active) {
          currentStream = s;
          setStream(s);
        } else {
          s.getTracks().forEach((t) => t.stop());
        }
      })
      .catch((err) => {
        console.error('Failed to open Cam1:', err);
        if (active) setStream(null);
      });

    return () => {
      active = false;
      currentStream?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [cam1DeviceId]);

  return stream;
}
