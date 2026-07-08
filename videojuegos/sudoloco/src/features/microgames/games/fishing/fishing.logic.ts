import type { Rng } from '@core/sudoku';

export interface FishingConfig {
  /** Cuándo pica el pez (desde el inicio del microjuego). */
  biteDelayMs: number;
  /** Taps necesarios desde el pique para sacar al pez. */
  tapsRequired: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** difficulty 0 → pique temprano y pocos taps; difficulty 1 → tardío y muchos. */
export function buildConfig(difficulty: number, rng: Rng): FishingConfig {
  const d = clamp01(difficulty);
  const minDelay = 800 + 600 * d;
  const maxDelay = 1400 + 800 * d;
  return {
    biteDelayMs: Math.round(minDelay + rng() * (maxDelay - minDelay)),
    tapsRequired: Math.round(8 + 10 * d),
  };
}

/** Escala visual del pez: 0.3 sin taps → 1.0 al completar. Saturada. */
export function fishScale(taps: number, tapsRequired: number): number {
  if (tapsRequired <= 0) return 1;
  return 0.3 + 0.7 * clamp01(taps / tapsRequired);
}

/** Frame del pez a mostrar: cicla la secuencia con cada tap. */
export function fishFrame(taps: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  return taps % frameCount;
}
