import type { Rng } from './prng';

export type Reward =
  | { kind: 'score'; amount: number }
  | { kind: 'time'; amount: number }
  | { kind: 'hint' }
  | { kind: 'silver_cell' }
  | { kind: 'golden_cell' }
  | { kind: 'life' }
  | { kind: 'crystal_heart' }
  | { kind: 'none' };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

// [score, time, hint, silver, golden, life, crystal] — never 'none', always gives something
function probsForLevel(level: number): number[] {
  const t = (level - 1) / 19;
  return [
    lerp(0.25, 0.20, t), // score
    lerp(0.26, 0.22, t), // time  (absorbs the old 'none' probability)
    lerp(0.18, 0.20, t), // hint
    lerp(0.12, 0.14, t), // silver_cell
    lerp(0.04, 0.08, t), // golden_cell
    lerp(0.05, 0.08, t), // life
    lerp(0.10, 0.08, t), // crystal_heart
  ];
}

export function rollReward(level: number, rng: Rng): Reward {
  const probs = probsForLevel(level);
  const roll = rng();
  let cum = 0;
  const kinds: Exclude<Reward['kind'], 'none'>[] = ['score', 'time', 'hint', 'silver_cell', 'golden_cell', 'life', 'crystal_heart'];

  for (let i = 0; i < probs.length; i++) {
    cum += probs[i]!;
    if (roll < cum) {
      const kind = kinds[i]!;
      if (kind === 'score') return { kind, amount: 100 * (Math.floor(level / 5) + 1) };
      if (kind === 'time') return { kind, amount: 10 + 5 * Math.floor(level / 5) };
      return { kind } as Reward;
    }
  }
  // Fallback: always give time if rounding leaves a gap
  return { kind: 'time', amount: 10 + 5 * Math.floor(level / 5) };
}

export function microgameTimeBonus(level: number): number {
  return 15 + 5 * Math.floor(level / 5);
}
