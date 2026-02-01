import { useCallback } from 'react';

type SoundType = 'recordStart' | 'recordStop' | 'scanSuccess' | 'scanError';

// Map file names to sound types:
//   record-start.mp3  → recordStart
//   record-stop.mp3   → recordStop
//   scan-success.mp3  → scanSuccess
//   scan-error.mp3    → scanError
const fileNameToType: Record<string, SoundType> = {
  'record-start': 'recordStart',
  'record-stop': 'recordStop',
  'scan-success': 'scanSuccess',
  'scan-error': 'scanError',
};

// Vite bundles matching files at build time. If no files exist, this is just {}.
const soundModules = import.meta.glob<{ default: string }>(
  '../assets/sounds/*.{mp3,wav,ogg,m4a}',
  { eager: true },
);

// Build URL map from bundled sound files
const bundledSounds: Partial<Record<SoundType, string>> = {};
for (const [path, mod] of Object.entries(soundModules)) {
  // path looks like "../assets/sounds/record-start.mp3"
  const fileName = path.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
  const soundType = fileNameToType[fileName];
  if (soundType) {
    bundledSounds[soundType] = mod.default;
  }
}

// Pre-create Audio elements for bundled sounds
const audioCache = new Map<string, HTMLAudioElement>();

function playBundledFile(url: string) {
  let audio = audioCache.get(url);
  if (!audio) {
    audio = new Audio(url);
    audioCache.set(url, audio);
  }
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// --- Fallback programmatic tones ---
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

function playRecordStart() {
  playTone(440, 0.12);
  setTimeout(() => playTone(880, 0.15), 120);
}

function playRecordStop() {
  playTone(880, 0.12);
  setTimeout(() => playTone(440, 0.15), 120);
}

function playScanSuccess() {
  playTone(1200, 0.1, 'sine', 0.4);
}

function playScanError() {
  playTone(300, 0.35, 'square', 0.25);
}

export function useSounds() {
  const play = useCallback((type: SoundType) => {
    // Use bundled audio file if available
    const bundledUrl = bundledSounds[type];
    if (bundledUrl) {
      playBundledFile(bundledUrl);
      return;
    }

    // Fallback to programmatic tones
    switch (type) {
      case 'recordStart':
        playRecordStart();
        break;
      case 'recordStop':
        playRecordStop();
        break;
      case 'scanSuccess':
        playScanSuccess();
        break;
      case 'scanError':
        playScanError();
        break;
    }
  }, []);

  return { play };
}
