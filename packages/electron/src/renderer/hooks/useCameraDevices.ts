import { useState, useEffect } from 'react';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export function useCameraDevices() {
  const [devices, setDevices] = useState<CameraDevice[]>([]);

  useEffect(() => {
    async function enumerate() {
      // Need to request permission first to get labels
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        // permission denied
      }

      const all = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = all
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || 'Camera ' + d.deviceId.slice(0, 6) }));
      setDevices(videoDevices);
    }

    enumerate();
    navigator.mediaDevices.addEventListener('devicechange', enumerate);
    return () => navigator.mediaDevices.removeEventListener('devicechange', enumerate);
  }, []);

  return devices;
}
