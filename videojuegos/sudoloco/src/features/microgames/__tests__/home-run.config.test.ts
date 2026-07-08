import { createRng } from '@core/sudoku';
import { buildConfig } from '../games/home-run/config';

describe('home-run buildConfig', () => {
  it('speeds up the ball as difficulty rises', () => {
    const easy = buildConfig(0, createRng('easy'));
    const hard = buildConfig(1, createRng('hard'));
    expect(hard.travelMs).toBeLessThan(easy.travelMs);
  });

  it('keeps travelMs positive', () => {
    expect(buildConfig(1, createRng('a')).travelMs).toBeGreaterThan(0);
  });

  it('is deterministic for a given seed', () => {
    const a = buildConfig(0.5, createRng('same-seed'));
    const b = buildConfig(0.5, createRng('same-seed'));
    expect(a).toEqual(b);
  });

  it('keeps the trajectory params within their expected ranges', () => {
    for (let i = 0; i < 50; i++) {
      const c = buildConfig(i / 50, createRng(`seed-${i}`));
      expect(c.startYRatio).toBeGreaterThanOrEqual(0.25);
      expect(c.startYRatio).toBeLessThanOrEqual(0.55);
      expect(c.waveAmplitudeRatio).toBeGreaterThanOrEqual(0.08);
      expect(c.waveAmplitudeRatio).toBeLessThanOrEqual(0.18);
      expect(c.waveFrequency).toBeGreaterThanOrEqual(1);
      expect(c.waveFrequency).toBeLessThanOrEqual(2.4);
      expect(c.wavePhase).toBeGreaterThanOrEqual(0);
      expect(c.wavePhase).toBeLessThanOrEqual(Math.PI * 2);
    }
  });
});
