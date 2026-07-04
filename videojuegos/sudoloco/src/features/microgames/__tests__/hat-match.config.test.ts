import { buildConfig } from '../games/hat-match/config';

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe('hat-match buildConfig', () => {
  it('has 3 characters and 1 hat at difficulty 0', () => {
    const cfg = buildConfig(0, seq([0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(cfg.targets).toHaveLength(3);
    expect(cfg.draggables).toHaveLength(1);
  });

  it('has 4 characters and 2 hats at difficulty 1', () => {
    const cfg = buildConfig(1, seq([0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(cfg.targets).toHaveLength(4);
    expect(cfg.draggables).toHaveLength(2);
  });

  it('every hat belongs to a character present on the board', () => {
    const cfg = buildConfig(1, seq([0.7, 0.1, 0.9, 0.3, 0.5]));
    const targetIds = new Set(cfg.targets.map((t) => t.id));
    for (const d of cfg.draggables) {
      expect(targetIds.has(d.targetId)).toBe(true);
    }
  });

  it('is deterministic for a given rng sequence', () => {
    const a = buildConfig(0.5, seq([0.2, 0.8, 0.4, 0.1, 0.6]));
    const b = buildConfig(0.5, seq([0.2, 0.8, 0.4, 0.1, 0.6]));
    expect(a).toEqual(b);
  });
});
