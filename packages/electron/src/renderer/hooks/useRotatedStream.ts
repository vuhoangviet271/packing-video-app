import { useEffect, useRef, useState } from 'react';

interface UseRotatedStreamOptions {
  stream: MediaStream | null;
  rotation: number; // 0, 90, 180, 270
}

/**
 * Xoay video stream bằng canvas để video output cũng bị xoay
 */
export function useRotatedStream({ stream, rotation }: UseRotatedStreamOptions): MediaStream | null {
  const [rotatedStream, setRotatedStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Nếu rotation = 0 hoặc không có stream, return stream gốc
    if (!stream || rotation === 0) {
      setRotatedStream(stream);
      return;
    }

    // Tạo canvas và video element
    const canvas = document.createElement('canvas');
    const video = document.createElement('video');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setRotatedStream(stream);
      return;
    }

    canvasRef.current = canvas;
    videoRef.current = video;

    // Thiết lập video
    video.srcObject = stream;
    video.play();

    video.onloadedmetadata = () => {
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Nếu xoay 90 hoặc 270 độ, hoán đổi width/height
      if (rotation === 90 || rotation === 270) {
        canvas.width = videoHeight;
        canvas.height = videoWidth;
      } else {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }

      // Vẽ video lên canvas với rotation
      const draw = () => {
        if (!video.paused && !video.ended) {
          ctx.save();

          // Di chuyển origin đến center
          ctx.translate(canvas.width / 2, canvas.height / 2);

          // Xoay
          ctx.rotate((rotation * Math.PI) / 180);

          // Vẽ video (centered)
          if (rotation === 90 || rotation === 270) {
            ctx.drawImage(video, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight);
          } else {
            ctx.drawImage(video, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight);
          }

          ctx.restore();

          rafRef.current = requestAnimationFrame(draw);
        }
      };

      draw();

      // Lấy stream từ canvas
      const canvasStream = canvas.captureStream(30); // 30 fps

      // Thêm audio track từ stream gốc nếu có
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach(track => {
        canvasStream.addTrack(track);
      });

      setRotatedStream(canvasStream);
    };

    return () => {
      // Cleanup
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (video.srcObject) {
        video.srcObject = null;
      }
      // Dừng rotated stream tracks (trừ audio tracks từ stream gốc)
      if (rotatedStream) {
        rotatedStream.getVideoTracks().forEach(track => track.stop());
      }
    };
  }, [stream, rotation]);

  return rotatedStream;
}
