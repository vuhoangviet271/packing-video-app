import { useRef, useCallback } from 'react';

type SoundType = 'recordStart' | 'recordStop' | 'scanSuccess' | 'scanError';

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
  const ctx = getAudioContext();
  // Rising two-tone: 440Hz then 880Hz
  playTone(440, 0.12);
  setTimeout(() => playTone(880, 0.15), 120);
}

function playRecordStop() {
  const ctx = getAudioContext();
  // Descending two-tone: 880Hz then 440Hz
  playTone(880, 0.12);
  setTimeout(() => playTone(440, 0.15), 120);
}

function playScanSuccess() {
  // Short high-pitched beep
  playTone(1200, 0.1, 'sine', 0.4);
}

function playScanError() {
  // Longer low buzz
  playTone(300, 0.35, 'square', 0.25);
}

export function useSounds() {
  const play = useCallback((type: SoundType) => {
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
