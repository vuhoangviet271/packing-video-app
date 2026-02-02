import { useState, useRef, useCallback, useEffect } from 'react';

interface UseMediaRecorderOptions {
  stream: MediaStream | null;
}

export function useMediaRecorder({ stream }: UseMediaRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2_500_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(1000); // collect data every second
    recorderRef.current = recorder;
    setIsRecording(true);
    setDuration(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [stream]);

  const stop = useCallback(async (): Promise<{ blob: Blob; duration: number }> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve({ blob: new Blob(), duration: 0 });
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setIsRecording(false);
        setDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
        resolve({ blob, duration: dur });
      };

      recorder.stop();
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    };
  }, []);

  return { isRecording, duration, start, stop };
}
