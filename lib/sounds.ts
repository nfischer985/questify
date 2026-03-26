// Singleton Web Audio API sound engine
// All functions are safe to call from any client component — they no-op during SSR.

import { useGameStore } from '@/store/gameStore';

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!_ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      _ctx = new Ctor();
    }
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
    return _ctx;
  } catch {
    return null;
  }
}

function note(
  ctx: AudioContext,
  freq: number,
  t: number,
  dur: number,
  vol: number,
  shape: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = shape;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export type SoundType = 'tap' | 'complete' | 'levelup' | 'coin' | 'nav' | 'error';

export function sound(type: SoundType) {
  const { soundEnabled } = useGameStore.getState();
  if (!soundEnabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  switch (type) {
    case 'tap':
      note(ctx, 1100, t, 0.038, 0.10, 'triangle');
      break;
    case 'complete':
      [523, 659, 784, 1047].forEach((f, i) => note(ctx, f, t + i * 0.09, 0.22, 0.15));
      break;
    case 'levelup':
      [392, 494, 587, 784, 988, 1175].forEach((f, i) => note(ctx, f, t + i * 0.07, 0.28, 0.17));
      break;
    case 'coin':
      note(ctx, 1319, t, 0.07, 0.12);
      note(ctx, 1760, t + 0.065, 0.12, 0.12);
      break;
    case 'nav':
      note(ctx, 700, t, 0.055, 0.07);
      break;
    case 'error':
      note(ctx, 180, t, 0.18, 0.16, 'sawtooth');
      break;
  }
}

export function haptic(pattern: number | number[] = 8) {
  const { hapticEnabled } = useGameStore.getState();
  if (!hapticEnabled) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}
