import type { Difficulty } from './types';
import type { Rng } from './prng';

interface ClueRange {
  readonly min: number;
  readonly max: number;
}

const CLUE_RANGES: Record<Difficulty, ClueRange> = {
  beginner: { min: 36, max: 40 },
  intermediate: { min: 30, max: 35 },
  hard: { min: 26, max: 29 },
  expert: { min: 22, max: 25 },
};

export function getClueRange(difficulty: Difficulty): ClueRange {
  return CLUE_RANGES[difficulty];
}

export function getClueCount(difficulty: Difficulty, rng: Rng): number {
  const { min, max } = CLUE_RANGES[difficulty];
  return min + Math.floor(rng() * (max - min + 1));
}
