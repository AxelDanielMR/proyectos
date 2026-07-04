import { useSudolocoStore } from '../store';

describe('reveal flow (pausa / remontaje)', () => {
  beforeEach(() => {
    useSudolocoStore.getState().resetRun();
  });

  it('beginReveal no otorga hasta finishReveal; pausa no revienta el reveal; grant una sola vez', () => {
    const s = useSudolocoStore;
    s.getState().startRun('seed-test');
    // llegar a fase microgame
    s.getState().onBoxComplete(0);
    expect(s.getState().phase).toBe('microgame');

    const livesBefore = s.getState().lives;
    s.getState().beginReveal({ kind: 'life' });
    expect(s.getState().pendingReward).toEqual({ kind: 'life' });
    expect(s.getState().lives).toBe(livesBefore); // aún no otorga

    // pausar durante el reveal: pendingReward se conserva, finishReveal es no-op
    s.getState().pauseRun();
    expect(s.getState().phase).toBe('paused');
    s.getState().finishReveal();
    expect(s.getState().phase).toBe('paused');
    expect(s.getState().pendingReward).toEqual({ kind: 'life' });
    expect(s.getState().lives).toBe(livesBefore);

    // reanudar y terminar el reveal: otorga exactamente una vez
    s.getState().resumeRun();
    expect(s.getState().phase).toBe('microgame');
    s.getState().finishReveal();
    expect(s.getState().phase).toBe('playing');
    expect(s.getState().pendingReward).toBeNull();
    expect(s.getState().lives).toBe(livesBefore + 1);

    // un segundo finishReveal no vuelve a otorgar
    s.getState().finishReveal();
    expect(s.getState().lives).toBe(livesBefore + 1);
  });

  it('perder el microjuego da la mitad del bonus de tiempo y vuelve a jugar', () => {
    const s = useSudolocoStore;
    s.getState().startRun('seed-test');
    s.getState().onBoxComplete(0);
    expect(s.getState().phase).toBe('microgame');

    // Nivel 1: bonus estándar = 20 + floor(1/2) = 20; la mitad = floor(20/2) = 10.
    const timeBefore = s.getState().timeRemaining;
    s.getState().loseMicrogame();

    expect(s.getState().phase).toBe('playing');
    expect(s.getState().timeRemaining).toBe(timeBefore + 10);

    // Fuera de la fase microgame es no-op (no regala tiempo).
    const timeAfter = s.getState().timeRemaining;
    s.getState().loseMicrogame();
    expect(s.getState().timeRemaining).toBe(timeAfter);
  });
});
