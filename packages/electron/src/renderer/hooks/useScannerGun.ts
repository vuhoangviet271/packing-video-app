import { useEffect, useRef, useCallback } from 'react';

interface UseScannerGunOptions {
  onScan: (code: string) => void;
  enabled?: boolean;
  maxKeystrokeGapMs?: number;
  minLength?: number;
}

export function useScannerGun({
  onScan,
  enabled = true,
  maxKeystrokeGapMs = 80,
  minLength = 3,
}: UseScannerGunOptions) {
  const bufferRef = useRef<string>('');
  const lastKeystrokeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    lastKeystrokeRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea/select
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const now = Date.now();

      if (e.key === 'Enter') {
        const buffer = bufferRef.current;
        if (buffer.length >= minLength) {
          // This looks like scanner gun input - prevent default and fire callback
          e.preventDefault();
          e.stopImmediatePropagation();
          const code = buffer.trim();
          resetBuffer();
          if (code.length >= minLength) {
            onScanRef.current(code);
          }
        } else {
          resetBuffer();
        }
        return;
      }

      // Only accumulate printable single characters
      if (e.key.length !== 1) {
        resetBuffer();
        return;
      }

      // Check timing gap
      if (lastKeystrokeRef.current > 0 && now - lastKeystrokeRef.current > maxKeystrokeGapMs) {
        // Gap too large - reset (was human typing or stale buffer)
        bufferRef.current = '';
      }

      bufferRef.current += e.key;
      lastKeystrokeRef.current = now;

      // Prevent scanner characters from triggering other handlers
      if (bufferRef.current.length >= 2) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    // Use capture phase to intercept before other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, maxKeystrokeGapMs, minLength, resetBuffer]);
}
