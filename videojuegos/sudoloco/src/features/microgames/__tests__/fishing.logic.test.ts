import { createRng } from '@core/sudoku';
import { buildConfig, fishScale, fishFrame } from '../games/fishing/fishing.logic';

describe('fishing buildConfig', () => {
  it('difficulty 0: 8 taps y pique en [800, 1400] ms', () => {
    for (let i = 0; i < 50; i++) {
      const c = buildConfig(0, createRng(`easy-${i}`));
      expect(c.tapsRequired).toBe(8);
      expect(c.biteDelayMs).toBeGreaterThanOrEqual(800);
      expect(c.biteDelayMs).toBeLessThanOrEqual(1400);
    }
  });

  it('difficulty 1: 18 taps y pique en [1400, 2200] ms', () => {
    for (let i = 0; i < 50; i++) {
      const c = buildConfig(1, createRng(`hard-${i}`));
      expect(c.tapsRequired).toBe(18);
      expect(c.biteDelayMs).toBeGreaterThanOrEqual(1400);
      expect(c.biteDelayMs).toBeLessThanOrEqual(2200);
    }
  });

  it('clampea la dificultad fuera de 0..1', () => {
    expect(buildConfig(-1, createRng('a')).tapsRequired).toBe(8);
    expect(buildConfig(5, createRng('b')).tapsRequired).toBe(18);
  });

  it('es determinista con el mismo seed', () => {
    const a = buildConfig(0.5, createRng('same-seed'));
    const b = buildConfig(0.5, createRng('same-seed'));
    expect(a).toEqual(b);
  });
});

describe('fishScale', () => {
  it('empieza en 0.3 y termina en 1.0', () => {
    expect(fishScale(0, 10)).toBeCloseTo(0.3);
    expect(fishScale(10, 10)).toBeCloseTo(1.0);
  });

  it('es monótona creciente', () => {
    for (let t = 1; t <= 10; t++) {
      expect(fishScale(t, 10)).toBeGreaterThan(fishScale(t - 1, 10));
    }
  });

  it('no pasa de 1.0 con taps extra ni rompe con tapsRequired 0', () => {
    expect(fishScale(15, 10)).toBeCloseTo(1.0);
    expect(fishScale(3, 0)).toBe(1);
  });
});

describe('fishFrame', () => {
  it('cicla los frames con cada tap', () => {
    expect(fishFrame(0, 2)).toBe(0);
    expect(fishFrame(1, 2)).toBe(1);
    expect(fishFrame(2, 2)).toBe(0);
    expect(fishFrame(3, 2)).toBe(1);
  });

  it('devuelve 0 si no hay frames', () => {
    expect(fishFrame(5, 0)).toBe(0);
  });
});
