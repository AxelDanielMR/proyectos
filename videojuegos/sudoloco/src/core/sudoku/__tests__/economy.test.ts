import { computeRunReward } from '../economy';

describe('computeRunReward', () => {
  it('returns 0 coins for score=0 level=1', () => {
    expect(computeRunReward(0, 1)).toEqual({ coins: 0 });
  });

  it('contributes from score: 100 score → 1 coin', () => {
    expect(computeRunReward(100, 0)).toEqual({ coins: 1 });
  });

  it('contributes from level: level=3 → 1 coin', () => {
    expect(computeRunReward(0, 3)).toEqual({ coins: 1 });
  });

  it('truncates remainder from score', () => {
    expect(computeRunReward(199, 0)).toEqual({ coins: 1 });
    expect(computeRunReward(299, 0)).toEqual({ coins: 2 });
  });

  it('truncates remainder from level', () => {
    expect(computeRunReward(0, 5)).toEqual({ coins: 1 });
    expect(computeRunReward(0, 6)).toEqual({ coins: 2 });
  });

  it('combines score and level correctly', () => {
    // score=500 → 5, level=9 → 3, total=8
    expect(computeRunReward(500, 9)).toEqual({ coins: 8 });
  });

  it('scales as expected at higher values', () => {
    // score=10000 → 100, level=30 → 10, total=110
    expect(computeRunReward(10000, 30)).toEqual({ coins: 110 });
  });
});
