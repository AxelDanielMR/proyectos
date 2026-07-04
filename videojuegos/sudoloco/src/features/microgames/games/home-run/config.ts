import type { TapTimingConfig } from '../../kit/templates/TapTimingGame';
import { windowForDifficulty } from '../../kit/templates/tapTiming.logic';
import { BALL, BATTER } from './assets';

/** difficulty 0 → lento y ventana ancha; difficulty 1 → rápido y ventana angosta. */
export function buildConfig(difficulty: number): TapTimingConfig {
  const d = Math.max(0, Math.min(1, difficulty));
  return {
    window: windowForDifficulty(d),
    travelMs: Math.round(1900 - 800 * d), // 1900ms → 1100ms
    ball: BALL,
    batter: BATTER,
  };
}
