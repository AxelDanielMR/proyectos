import type { Board, Puzzle } from './types';
import { BOX_CELLS } from './validator';

export function computeProgress(board: Board, puzzle: Puzzle): number {
  const { initial, solution } = puzzle;
  let toFill = 0;
  let filled = 0;
  for (let i = 0; i < 81; i++) {
    if (initial[i] === 0) {
      toFill++;
      if (board[i] !== 0 && board[i] === solution[i]) filled++;
    }
  }
  if (toFill === 0) return 100;
  return Math.round((filled / toFill) * 100);
}

function isBoxComplete(board: Board, box: number, solution: Board): boolean {
  const cells = BOX_CELLS[box]!;
  return cells.every((i) => board[i] !== 0 && board[i] === solution[i]);
}

// Returns the box index (0–8) that just became complete, or null if none did.
export function detectBoxCompletion(
  prev: Board,
  next: Board,
  solution: Board,
): number | null {
  for (let box = 0; box < 9; box++) {
    if (!isBoxComplete(prev, box, solution) && isBoxComplete(next, box, solution)) {
      return box;
    }
  }
  return null;
}
