import type { Microgame } from '../types';
import { levelToDifficulty, pickMicrogame } from '../selection';

const game = (id: string, minLevel: number): Microgame => ({
  id,
  nameKey: `microgames.${id}`,
  category: 'tap-timing',
  minLevel,
  durationMs: 3000,
  Component: () => null,
});

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe('levelToDifficulty', () => {
  it('is 0 at level 1 and clamps to [0,1]', () => {
    expect(levelToDifficulty(1)).toBe(0);
    expect(levelToDifficulty(0)).toBe(0);
    expect(levelToDifficulty(100)).toBe(1);
  });

  it('grows monotonically', () => {
    expect(levelToDifficulty(5)).toBeGreaterThan(levelToDifficulty(2));
    expect(levelToDifficulty(20)).toBeLessThanOrEqual(1);
  });
});

describe('pickMicrogame', () => {
  const games = [game('a', 1), game('b', 1), game('c', 5)];

  it('excludes games above the current level', () => {
    const picked = pickMicrogame(games, 3, new Set(), seq([0.99]));
    expect(picked?.id).not.toBe('c');
  });

  it('prefers undiscovered games', () => {
    const picked = pickMicrogame(games, 10, new Set(['a', 'b']), seq([0]));
    expect(picked?.id).toBe('c');
  });

  it('falls back to all eligible when everything is discovered', () => {
    const picked = pickMicrogame(games, 10, new Set(['a', 'b', 'c']), seq([0]));
    expect(picked).not.toBeNull();
  });

  it('returns null when none are eligible', () => {
    expect(pickMicrogame(games, 0, new Set(), seq([0]))).toBeNull();
  });

  it('is deterministic for a given rng', () => {
    const p1 = pickMicrogame(games, 10, new Set(), seq([0.5]));
    const p2 = pickMicrogame(games, 10, new Set(), seq([0.5]));
    expect(p1?.id).toBe(p2?.id);
  });
});
