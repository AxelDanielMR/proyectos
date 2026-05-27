import type { Rng } from './prng';

export type Reward =
  | { kind: 'score'; amount: number }
  | { kind: 'life' }
  | { kind: 'hint' }
  | { kind: 'golden_cell' }
  | { kind: 'none' };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

// Returns [score, hint, golden, life, none] probabilities for a given level.
// Anchors: level 1 → t=0, level 20+ → t=1 (clamped).
function probsForLevel(level: number): [number, number, number, number, number] {
  const t = (level - 1) / 19;
  return [
    lerp(0.40, 0.33, t),
    lerp(0.25, 0.29, t),
    lerp(0.05, 0.10, t),
    lerp(0.05, 0.10, t),
    lerp(0.25, 0.18, t),
  ];
}

export function rollReward(level: number, rng: Rng): Reward {
  const [pScore, pHint, pGolden, pLife] = probsForLevel(level);
  const roll = rng();

  let cum = pScore!;
  if (roll < cum) {
    const amount = 100 * (Math.floor(level / 5) + 1);
    return { kind: 'score', amount };
  }
  cum += pHint!;
  if (roll < cum) return { kind: 'hint' };
  cum += pGolden!;
  if (roll < cum) return { kind: 'golden_cell' };
  cum += pLife!;
  if (roll < cum) return { kind: 'life' };
  return { kind: 'none' };
}
