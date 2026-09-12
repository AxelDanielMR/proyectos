import { create } from 'zustand';
import {
  createRng,
  generate,
  levelConfig,
  INITIAL_TIME_S,
  buildPuzzleSeed,
  computeRunReward,
} from '@core/sudoku';
import type { Puzzle, Rng, Reward } from '@core/sudoku';

import type { RestoredRun } from './save';

export type RunPhase =
  'idle' | 'playing' | 'paused' | 'microgame' | 'between_levels' | 'gameover';

export interface RunState {
  phase: RunPhase;
  previousPhase: RunPhase; // para reanudar desde pausa
  level: number;
  lives: number; // corazones normales (con ventajas)
  crystalHearts: number; // corazones de cristal (sin ventajas)
  timeRemaining: number;
  score: number;
  hints: number;
  silverCells: number;
  goldenCells: number;
  coinsEarned: number;
  settled: boolean; // true una vez canjeadas monedas/highscore al terminar la run
  pendingReward: Reward | null; // premio ganado en microjuego, en curso de revelarse (animación RewardReveal)
  puzzle: Puzzle | null;
  rng: Rng | null;
  seed: string;
}

interface RunActions {
  startRun(seed?: string): void;
  restoreRun(restored: RestoredRun): void;
  markSettled(): void;
  onCellCorrect(idx: number): void;
  onCellIncorrect(): void;
  onBoxComplete(boxIndex: number): void;
  onPuzzleComplete(): void;
  tick(): void;
  pauseRun(): void;
  resumeRun(): void;
  grantReward(reward: Reward): void;
  beginReveal(reward: Reward): void;
  finishReveal(): void;
  exitMicrogame(): void;
  loseMicrogame(): void;
  nextLevel(): void;
  resetRun(): void;
  _finishRun(): void;
}

const INITIAL_STATE: Omit<RunState, 'puzzle' | 'rng'> = {
  phase: 'idle',
  previousPhase: 'idle',
  level: 1,
  lives: 3,
  crystalHearts: 0,
  timeRemaining: INITIAL_TIME_S,
  score: 0,
  hints: 0,
  silverCells: 0,
  goldenCells: 0,
  coinsEarned: 0,
  settled: false,
  pendingReward: null,
  seed: '',
};

// Bonus de tiempo del microjuego (segundos), escalado con la dificultad del nivel.
function timeBoostSeconds(level: number): number {
  return 20 + Math.floor(level / 2);
}

export const useSudolocoStore = create<RunState & RunActions>()((set, get) => ({
  ...INITIAL_STATE,
  puzzle: null,
  rng: null,

  startRun(seed) {
    const runSeed = seed ?? String(Date.now());
    const rng = createRng(runSeed);
    const { difficulty } = levelConfig(1);
    const puzzle = generate(difficulty, buildPuzzleSeed(runSeed, 1));
    set({ ...INITIAL_STATE, phase: 'playing', puzzle, rng, seed: runSeed });
  },

  restoreRun(r) {
    set({
      phase: 'playing',
      previousPhase: 'idle',
      level: r.level,
      lives: r.lives,
      crystalHearts: r.crystalHearts,
      timeRemaining: r.timeRemaining,
      score: r.score,
      // El run store solo usa estos contadores para sincronizar con el game
      // store (diff = otorgados − restantes). Fijarlos a los restantes evita
      // re-otorgar powerups ya usados al reanudar.
      hints: r.hintsRemaining,
      silverCells: r.silverRemaining,
      goldenCells: r.goldenRemaining,
      coinsEarned: 0,
      settled: false,
      pendingReward: null,
      seed: r.seed,
      puzzle: r.puzzle,
      rng: r.rng,
    });
  },

  markSettled() {
    set({ settled: true });
  },

  onCellCorrect(idx) {
    const { level, score, phase } = get();
    if (phase !== 'playing') return;
    const { secsPerCell } = levelConfig(level);
    const multiplier = Math.floor(level / 5) + 1;
    set((s) => ({
      timeRemaining: s.timeRemaining + secsPerCell,
      score: score + 10 * multiplier,
    }));
    void idx;
  },

  onCellIncorrect() {
    const { phase } = get();
    if (phase !== 'playing') return;
    set((s) => {
      // Crystal hearts absorb errors first (no time bonus)
      if (s.crystalHearts > 0) {
        return { crystalHearts: s.crystalHearts - 1 };
      }
      // Normal hearts: lose one + gain 30s bonus
      const lives = s.lives - 1;
      if (lives <= 0) return { lives, phase: 'gameover' as RunPhase };
      return { lives, timeRemaining: s.timeRemaining + 30 };
    });
    const { phase: nextPhase } = get();
    if (nextPhase === 'gameover') get()._finishRun();
  },

  onBoxComplete(_boxIndex) {
    const { phase } = get();
    if (phase !== 'playing') return;
    set({ phase: 'microgame' });
  },

  onPuzzleComplete() {
    const { level, score, phase } = get();
    if (phase !== 'playing') return;
    const bonus = 500 * level;
    set({ score: score + bonus, phase: 'between_levels' });
  },

  tick() {
    const { phase } = get();
    if (phase !== 'playing') return;
    set((s) => {
      const timeRemaining = s.timeRemaining - 1;
      if (timeRemaining > 0) return { timeRemaining };
      // Time ran out — normal hearts (>1) save you with +60s
      if (s.lives > 1) {
        return { lives: s.lives - 1, timeRemaining: 60 };
      }
      return { timeRemaining: 0, phase: 'gameover' as RunPhase };
    });
    const { phase: nextPhase } = get();
    if (nextPhase === 'gameover') get()._finishRun();
  },

  pauseRun() {
    const state = get();
    // Permitir pausar desde cualquier fase jugable
    if (['playing', 'microgame', 'between_levels'].includes(state.phase)) {
      set({ previousPhase: state.phase, phase: 'paused' });
    }
  },

  resumeRun() {
    const state = get();
    if (state.phase === 'paused' && state.previousPhase !== 'paused') {
      set({ phase: state.previousPhase });
    }
  },

  grantReward(reward) {
    switch (reward.kind) {
      case 'time_boost': {
        const { level } = get();
        set((s) => ({
          timeRemaining: s.timeRemaining + timeBoostSeconds(level),
        }));
        break;
      }
      case 'hint':
        set((s) => ({ hints: s.hints + 1 }));
        break;
      case 'silver_cell':
        set((s) => ({ silverCells: s.silverCells + 1 }));
        break;
      case 'golden_cell':
        set((s) => ({ goldenCells: s.goldenCells + 1 }));
        break;
      case 'life':
        set((s) => ({ lives: s.lives + 1 }));
        break;
      case 'crystal_heart':
        set((s) => ({ crystalHearts: s.crystalHearts + 1 }));
        break;
    }
  },

  beginReveal(reward) {
    // Victoria de microjuego: entra en la fase de revelado. La fase sigue en
    // 'microgame'; RewardReveal (gated en phase==='microgame') se monta y anima.
    if (get().phase !== 'microgame') return;
    set({ pendingReward: reward });
  },

  finishReveal() {
    // Solo otorgar/volver a jugar si seguimos en la fase de microjuego. Evita que
    // un onDone que se dispara justo tras pausar reactive el juego (recurrencia del
    // bug de pausa). Al reanudar, phase vuelve a 'microgame' y el reveal reproduce.
    if (get().phase !== 'microgame') return;
    const { pendingReward } = get();
    if (pendingReward) get().grantReward(pendingReward);
    set({ pendingReward: null, phase: 'playing' });
  },

  exitMicrogame() {
    set({ phase: 'playing' });
  },

  loseMicrogame() {
    // Derrota de microjuego: consolación de ½ del bonus de tiempo estándar.
    if (get().phase !== 'microgame') return;
    const { level } = get();
    const consolation = Math.floor(timeBoostSeconds(level) / 2);
    set((s) => ({
      timeRemaining: s.timeRemaining + consolation,
      phase: 'playing',
    }));
  },

  nextLevel() {
    const { level, seed, rng, phase } = get();
    if (phase !== 'between_levels') return;
    const nextLevel = level + 1;
    const { difficulty } = levelConfig(nextLevel);
    const puzzle = generate(difficulty, buildPuzzleSeed(seed, nextLevel));
    set((s) => ({
      level: nextLevel,
      puzzle,
      phase: 'playing',
      rng,
      timeRemaining: s.timeRemaining + 60,
    }));
  },

  resetRun() {
    set({ ...INITIAL_STATE, puzzle: null, rng: null });
  },

  _finishRun() {
    const { score, level } = get();
    const { coins } = computeRunReward(score, level);
    set({ coinsEarned: coins });
  },
}));
