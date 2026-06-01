import { rollReward } from '../rewards';
import { createRng } from '../prng';
import type { Rng } from '../prng';

describe('rollReward', () => {
  let rng: Rng;

  beforeEach(() => {
    rng = createRng('test-seed');
  });

  it('retorna un Reward válido', () => {
    const reward = rollReward(1, rng);
    expect(reward).toHaveProperty('kind');
    const kinds = ['time', 'hint', 'silver_cell', 'golden_cell', 'life', 'crystal_heart', 'none'];
    expect(kinds).toContain(reward.kind);
  });

  it('time reward tiene amount > 0', () => {
    let found = false;
    for (let i = 0; i < 100; i++) {
      const reward = rollReward(1, createRng(`seed-${i}`));
      if (reward.kind === 'time') {
        expect(reward.amount).toBeGreaterThan(0);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('probabilidades cambian por nivel (golden_cell más probable en nivel alto)', () => {
    let goldenCount = 0;
    for (let i = 0; i < 100; i++) {
      const reward = rollReward(1, createRng(`early-${i}`));
      if (reward.kind === 'golden_cell') goldenCount++;
    }
    const earlyRate = goldenCount / 100;

    goldenCount = 0;
    for (let i = 0; i < 100; i++) {
      const reward = rollReward(20, createRng(`late-${i}`));
      if (reward.kind === 'golden_cell') goldenCount++;
    }
    const lateRate = goldenCount / 100;

    expect(lateRate).toBeGreaterThan(earlyRate);
  });
});
