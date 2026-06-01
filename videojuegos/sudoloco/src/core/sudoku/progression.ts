import type { Difficulty } from './types';

export const INITIAL_TIME_S = 180;

export interface LevelConfig {
  difficulty: Difficulty;
  secsPerCell: number;
}

export function levelConfig(level: number): LevelConfig {
  const difficulty: Difficulty =
    level <= 3 ? 'beginner'
    : level <= 7 ? 'intermediate'
    : level <= 12 ? 'hard'
    : 'expert';

  const secsPerCell =
    difficulty === 'beginner' ? 4
    : difficulty === 'intermediate' ? 3
    : 2; // hard o expert

  return { difficulty, secsPerCell };
}
