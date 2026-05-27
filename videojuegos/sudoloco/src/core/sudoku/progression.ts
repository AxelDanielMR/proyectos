import type { Difficulty } from './types';

export const INITIAL_TIME_S = 180;

export interface LevelConfig {
  readonly difficulty: Difficulty;
  readonly secsPerCell: number;
}

export function levelConfig(level: number): LevelConfig {
  if (level <= 3) return { difficulty: 'beginner', secsPerCell: 4 };
  if (level <= 7) return { difficulty: 'intermediate', secsPerCell: 3 };
  if (level <= 12) return { difficulty: 'hard', secsPerCell: 2 };
  return { difficulty: 'expert', secsPerCell: 2 };
}
