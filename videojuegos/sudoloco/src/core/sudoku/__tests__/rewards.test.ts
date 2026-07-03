import { rollReward } from '../rewards';
import { createRng } from '../prng';
import type { Rng } from '../prng';

describe('rollReward', () => {
  let rng: Rng;

  beforeEach(() => {
    rng = createRng('test-seed');
  });

  const VALID_KINDS = [
    'time_boost',
    'hint',
    'silver_cell',
    'golden_cell',
    'life',
    'crystal_heart',
  ];

  it('retorna un Reward válido (sin none)', () => {
    const reward = rollReward(1, rng);
    expect(reward).toHaveProperty('kind');
    expect(VALID_KINDS).toContain(reward.kind);
  });

  it('nunca devuelve none en todo el rango de niveles y seeds', () => {
    for (let level = 1; level <= 25; level++) {
      for (let i = 0; i < 200; i++) {
        const reward = rollReward(level, createRng(`L${level}-${i}`));
        expect(reward.kind).not.toBe('none');
        expect(VALID_KINDS).toContain(reward.kind);
      }
    }
  });

  it('time_boost puede ocurrir', () => {
    let found = false;
    for (let i = 0; i < 100; i++) {
      if (rollReward(1, createRng(`seed-${i}`)).kind === 'time_boost') {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('golden_cell es más probable en nivel alto que en nivel bajo', () => {
    let earlyCount = 0;
    for (let i = 0; i < 200; i++) {
      if (rollReward(1, createRng(`early-${i}`)).kind === 'golden_cell')
        earlyCount++;
    }
    let lateCount = 0;
    for (let i = 0; i < 200; i++) {
      if (rollReward(20, createRng(`late-${i}`)).kind === 'golden_cell')
        lateCount++;
    }
    expect(lateCount).toBeGreaterThan(earlyCount);
  });
});
