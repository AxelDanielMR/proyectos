import { buildConfig } from '../games/home-run/config';

describe('home-run buildConfig', () => {
  it('narrows the window and speeds up the ball as difficulty rises', () => {
    const easy = buildConfig(0);
    const hard = buildConfig(1);
    expect(hard.window.end - hard.window.start).toBeLessThan(easy.window.end - easy.window.start);
    expect(hard.travelMs).toBeLessThan(easy.travelMs);
  });

  it('keeps travelMs positive', () => {
    expect(buildConfig(1).travelMs).toBeGreaterThan(0);
  });
});
