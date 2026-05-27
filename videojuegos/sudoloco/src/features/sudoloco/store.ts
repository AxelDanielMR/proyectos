import { create } from 'zustand';
import { createRng, generate, levelConfig, INITIAL_TIME_S } from '@core/sudoku';
import type { Puzzle } from '@core/sudoku';
import { computeRunReward } from '@core/sudoku';
import type { Rng } from '@core/sudoku';

export type RunPhase = 'idle' | 'playing' | 'microgame' | 'between_levels' | 'gameover';

export interface RunState {
  phase: RunPhase;
  level: number;
  lives: number;
  timeRemaining: number;
  score: number;
  hints: number;
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
  grantReward(reward: import('@core/sudoku').Reward): void;
  exitMicrogame(): void;
  nextLevel(): void;
  resetRun(): void;
  _finishRun(): void;
}

function buildSeed(base: string, level: number): string {
  return `${base}:${level}`;
}

export const useSudolocoStore = create<RunState & RunActions>()((set, get) => ({
  phase: 'idle',
  level: 1,
  lives: 3,
  timeRemaining: INITIAL_TIME_S,
  score: 0,
  hints: 0,
  goldenCells: 0,
  coinsEarned: 0,
  puzzle: null,
  rng: null,
  seed: '',

  startRun(seed) {
    const runSeed = seed ?? String(Date.now());
    const rng = createRng(runSeed);
    const { difficulty } = levelConfig(1);
    const puzzle = generate(difficulty, buildSeed(runSeed, 1));

    const state: Partial<RunState> = {
      phase: 'playing',
      level: 1,
      lives: 3,
      timeRemaining: INITIAL_TIME_S,
      score: 0,
      hints: 0,
      goldenCells: 0,
      coinsEarned: 0,
      puzzle,
      rng,
      seed: runSeed,
    };
    set(state as RunState);
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
      const lives = s.lives - 1;
      return { lives, phase: lives <= 0 ? 'gameover' : 'playing' };
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
      if (timeRemaining <= 0) {
        return { timeRemaining: 0, phase: 'gameover' };
      }
      return { timeRemaining };
    });
    const { phase: nextPhase } = get();
    if (nextPhase === 'gameover') get()._finishRun();
  },

  grantReward(reward) {
    switch (reward.kind) {
      case 'score':
        set((s) => ({ score: s.score + reward.amount }));
        break;
      case 'hint':
        set((s) => ({ hints: s.hints + 1 }));
        break;
      case 'golden_cell':
        set((s) => ({ goldenCells: s.goldenCells + 1 }));
        break;
      case 'life':
        set((s) => ({ lives: s.lives + 1 }));
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
    set({ level: nextLevel, puzzle, phase: 'playing', rng });
  },

  resetRun() {
    set({
      phase: 'idle',
      level: 1,
      lives: 3,
      timeRemaining: INITIAL_TIME_S,
      score: 0,
      hints: 0,
      goldenCells: 0,
      coinsEarned: 0,
      puzzle: null,
      rng: null,
      seed: '',
    });
  },

  _finishRun() {
    const { score, level } = get();
    const { coins } = computeRunReward(score, level);
    set({ coinsEarned: coins });
  },
}));

