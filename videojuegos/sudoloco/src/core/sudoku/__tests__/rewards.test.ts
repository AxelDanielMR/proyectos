import { rollReward } from '../rewards';
import type { Reward } from '../rewards';

// Deterministic rng that always returns the given value.
const fixedRng = (value: number) => () => value;

describe('rollReward', () => {
  it('returns score reward when roll < 0.40 at level 1', () => {
    const reward = rollReward(1, fixedRng(0.39));
    expect(reward.kind).toBe('score');
  });

  it('score amount scales with level', () => {
    const r1 = rollReward(1, fixedRng(0)) as Extract<Reward, { kind: 'score' }>;
    const r5 = rollReward(5, fixedRng(0)) as Extract<Reward, { kind: 'score' }>;
    const r10 = rollReward(10, fixedRng(0)) as Extract<Reward, { kind: 'score' }>;
    expect(r1.amount).toBe(100);
    expect(r5.amount).toBe(200);
    expect(r10.amount).toBe(300);
  });

  it('returns hint reward when roll falls in hint range at level 1', () => {
    // score prob at level 1 = 0.40; hint starts at 0.40
    const reward = rollReward(1, fixedRng(0.41));
    expect(reward.kind).toBe('hint');
  });

  it('returns golden_cell when roll falls in its range at level 1', () => {
    // score=0.40, hint=0.25 → golden starts at 0.65
    const reward = rollReward(1, fixedRng(0.66));
    expect(reward.kind).toBe('golden_cell');
  });

  it('returns life when roll falls in its range at level 1', () => {
    // score=0.40, hint=0.25, golden=0.05 → life starts at 0.70
    const reward = rollReward(1, fixedRng(0.71));
    expect(reward.kind).toBe('life');
  });

  it('returns none when roll falls at the end at level 1', () => {
    // score=0.40, hint=0.25, golden=0.05, life=0.05 → none starts at 0.75
    const reward = rollReward(1, fixedRng(0.99));
    expect(reward.kind).toBe('none');
  });

  it('never throws for any level and any roll in [0,1)', () => {
    const rolls = [0, 0.1, 0.25, 0.4, 0.5, 0.65, 0.7, 0.75, 0.99];
    const levels = [1, 5, 10, 13, 20, 50];
    for (const level of levels) {
      for (const roll of rolls) {
        expect(() => rollReward(level, fixedRng(roll))).not.toThrow();
      }
    }
  });

  it('probabilities shift at higher levels (none becomes rarer, golden/life more common)', () => {
    let noneCount1 = 0;
    let noneCount20 = 0;
    let goldenCount1 = 0;
    let goldenCount20 = 0;

    const SAMPLES = 10000;
    let seed = 0;
    const seqRng = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      return ((seed >>> 0) / 4294967296);
    };

    const savedSeed = 0;
    let s = savedSeed;
    const rng1 = () => { s = (s + 0x6d2b79f5) | 0; return ((s >>> 0) / 4294967296); };
    s = savedSeed;
    const rng20 = () => { s = (s + 0x6d2b79f5) | 0; return ((s >>> 0) / 4294967296); };

    for (let i = 0; i < SAMPLES; i++) {
      if (rollReward(1, rng1).kind === 'none') noneCount1++;
      if (rollReward(20, rng20).kind === 'none') noneCount20++;
    }

    // none should be less frequent at level 20 (~18%) vs level 1 (~25%)
    expect(noneCount20 / SAMPLES).toBeLessThan(noneCount1 / SAMPLES);
  });
});
