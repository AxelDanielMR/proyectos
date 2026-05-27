import type { CellValue, Puzzle } from '@core/sudoku';
import type { Rng } from '@core/sudoku';

export interface SudokuGameCallbacks {
  onCellCorrect?: (idx: number, value: CellValue) => void;
  onCellIncorrect?: (idx: number, value: CellValue) => void;
  onBoxComplete?: (boxIndex: number) => void;
  onPuzzleComplete?: () => void;
}

export interface SudokuGameOptions {
  puzzle: Puzzle;
  rng: Rng;
  initialHints?: number;
  initialGoldenCells?: number;
  callbacks?: SudokuGameCallbacks;
}
