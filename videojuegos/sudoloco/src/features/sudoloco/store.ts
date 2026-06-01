import { create } from 'zustand';
import { createRng, generate, levelConfig, INITIAL_TIME_S } from '@core/sudoku';
import type { Puzzle } from '@core/sudoku';
import { computeRunReward } from '@core/sudoku';
import type { Rng } from '@core/sudoku';

export type RunPhase = 'idle' | 'playing' | 'paused' | 'microgame' | 'between_levels' | 'gameover';

export interface RunState {
  phase: RunPhase;
  previousPhase: RunPhase; // para reanudar desde pausa
  level: number;
  lives: number;         // corazones normales (con ventajas)
  crystalHearts: number; // corazones de cristal (sin ventajas)
  timeRemaining: number;
  score: number;
  hints: number;
  silverCells: number;
  goldenCells: number;
  coinsEarned: number;
  puzzle: Puzzle | null;
  rng: Rng | null;
  seed: string;
}

interface RunActions {
  startRun(seed?: string): void;
  onCellCorrect(idx: number): void;
  onCellIncorrect(): void;
  onBoxComplete(boxIndex: number): void;
  onPuzzleComplete(): void;
  tick(): void;
  pauseRun(): void;
  resumeRun(): void;
  grantReward(reward: import('@core/sudoku').Reward): void;
  exitMicrogame(): void;
  nextLevel(): void;
  resetRun(): void;
  _finishRun(): void;
}

function buildSeed(base: string, level: number): string {
  return `${base}:${level}`;
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
  seed: '',
};

export const useSudolocoStore = create<RunState & RunActions>()((set, get) => ({
  ...INITIAL_STATE,
  puzzle: null,
  rng: null,

  startRun(seed) {
    const runSeed = seed ?? String(Date.now());
    const rng = createRng(runSeed);
    const { difficulty } = levelConfig(1);
    const puzzle = generate(difficulty, buildSeed(runSeed, 1));
    set({ ...INITIAL_STATE, phase: 'playing', puzzle, rng, seed: runSeed });
  },

  onCellCorrect(idx) {
    const { level, score, phase } = get();
    if (phase !== 'playing') return;
    const { secsPerCell } = levelConfig(level);
    const multiplier = Math.floor(level / 5) + 1;
    set((s) => ({ timeRemaining: s.timeRemaining + secsPerCell, score: score + 10 * multiplier }));
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
        // Bonus seconds: 15 + (level / 2), escalado con dificultad
        const bonusSeconds = 15 + Math.floor(level / 2);
        set((s) => ({ timeRemaining: s.timeRemaining + bonusSeconds }));
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
      case 'none':
        break;
    }
  },

  exitMicrogame() {
    set({ phase: 'playing' });
  },

  nextLevel() {
    const { level, seed, rng, phase } = get();
    if (phase !== 'between_levels') return;
    const nextLevel = level + 1;
    const { difficulty } = levelConfig(nextLevel);
    const puzzle = generate(difficulty, buildSeed(seed, nextLevel));
    set((s) => ({ level: nextLevel, puzzle, phase: 'playing', rng, timeRemaining: s.timeRemaining + 60 }));
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
