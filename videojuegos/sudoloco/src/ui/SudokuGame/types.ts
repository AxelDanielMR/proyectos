import type { Board, CellValue, Puzzle, Rng } from '@core/sudoku';

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
  initialSilverCells?: number;
  initialGoldenCells?: number;
  initialBoard?: Board;
  initialNotes?: ReadonlyMap<number, ReadonlySet<CellValue>>;
  initialErrorIndices?: ReadonlySet<number>;
  callbacks?: SudokuGameCallbacks;
}
