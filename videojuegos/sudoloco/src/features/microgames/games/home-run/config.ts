import type { Rng } from '@core/sudoku';
import type { TapTimingConfig } from '../../kit/templates/TapTimingGame';
import { BALL, BATTER } from './assets';

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

/** difficulty 0 → bola lenta; difficulty 1 → bola rápida. Ganar solo requiere
 * mover el bate hacia la pelota antes de que llegue — sin ventana de precisión.
 * El trayecto siempre arranca en el borde izquierdo pero varía de alto y traza
 * una onda (S/zigzag) con parámetros sembrados por partida — nunca el mismo. */
export function buildConfig(difficulty: number, rng: Rng): TapTimingConfig {
  const d = Math.max(0, Math.min(1, difficulty));
  return {
    travelMs: Math.round(1900 - 800 * d), // 1900ms → 1100ms
    ball: BALL,
    batter: BATTER,
    startYRatio: lerp(0.25, 0.55, rng()),
    waveAmplitudeRatio: lerp(0.08, 0.18, rng()),
    waveFrequency: lerp(1, 2.4, rng()),
    wavePhase: rng() * Math.PI * 2,
  };
}
