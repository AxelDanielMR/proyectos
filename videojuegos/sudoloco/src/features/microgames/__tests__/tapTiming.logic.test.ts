import { windowForDifficulty, isWithinWindow } from '../kit/templates/tapTiming.logic';

describe('windowForDifficulty', () => {
  it('produces a narrower window as difficulty rises', () => {
    const easy = windowForDifficulty(0);
    const hard = windowForDifficulty(1);
    const easyWidth = easy.end - easy.start;
    const hardWidth = hard.end - hard.start;
    expect(hardWidth).toBeLessThan(easyWidth);
    expect(hardWidth).toBeGreaterThan(0);
  });
  it('keeps the window inside [0,1]', () => {
    for (const d of [0, 0.5, 1]) {
      const w = windowForDifficulty(d);
      expect(w.start).toBeGreaterThanOrEqual(0);
      expect(w.end).toBeLessThanOrEqual(1);
      expect(w.start).toBeLessThan(w.end);
    }
  });
});

describe('isWithinWindow', () => {
  it('is true inside [start,end] and false outside', () => {
    expect(isWithinWindow(0.7, 0.6, 0.8)).toBe(true);
    expect(isWithinWindow(0.6, 0.6, 0.8)).toBe(true);
    expect(isWithinWindow(0.5, 0.6, 0.8)).toBe(false);
    expect(isWithinWindow(0.9, 0.6, 0.8)).toBe(false);
  });
});
