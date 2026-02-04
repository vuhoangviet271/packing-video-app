import { useEffect, useRef } from 'react';

interface CameraPreviewProps {
  stream: MediaStream | null;
  style?: React.CSSProperties;
  rotation?: number; // 0, 90, 180, 270
}

export function CameraPreview({ stream, style, rotation = 0 }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream) {
      console.log('[CameraPreview] Setting stream to video element, active tracks:', stream.getTracks().length);
      videoEl.srcObject = stream;

      // Ensure video plays after stream is assigned
      videoEl.play()
        .then(() => console.log('[CameraPreview] Video playing successfully'))
        .catch(err => console.error('[CameraPreview] Video play failed:', err));
    } else {
      console.log('[CameraPreview] Stream is null, clearing video');
      videoEl.srcObject = null;
    }

    return () => {
      // Clean up video element when stream changes
      if (videoEl.srcObject) {
        console.log('[CameraPreview] Cleanup: clearing video srcObject');
        videoEl.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain', // Show full video without cropping
        background: '#000',
        borderRadius: 8,
        transform: `rotate(${rotation}deg)`,
        ...style,
      }}
    />
  );
}
