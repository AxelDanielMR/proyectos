export type Difficulty = 'beginner' | 'intermediate' | 'hard' | 'expert';

export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type Board = readonly CellValue[];

export interface Cell {
  readonly index: number;
  readonly row: number;
  readonly col: number;
  readonly box: number;
  readonly value: CellValue;
  readonly isFixed: boolean;
  readonly notes: ReadonlySet<number>;
}

export interface Puzzle {
  readonly seed: string;
  readonly difficulty: Difficulty;
  readonly initial: Board;
  readonly solution: Board;
}

export interface MoveResult {
  readonly valid: boolean;
  readonly conflictsWith: readonly number[];
}
