import type { Board, CellValue } from './types';
import { isValid } from './validator';

type MutableBoard = CellValue[];

// Minimum Remaining Values heuristic: pick the empty cell with the fewest
// valid candidates. This drastically reduces the backtracking search space.
function findBestEmpty(board: MutableBoard): number {
  let best = -1;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (board[i] !== 0) continue;
    let count = 0;
    for (let v = 1; v <= 9; v++) {
      if (isValid(board, i, v as CellValue)) count++;
    }
    if (count < bestCount) {
      best = i;
      bestCount = count;
      if (count === 0) return best; // dead end — bail immediately
    }
  }
  return best;
}

function findEmptyLinear(board: MutableBoard): number {
  for (let i = 0; i < 81; i++) {
    if (board[i] === 0) return i;
  }
  return -1;
}

function solveMutating(board: MutableBoard): boolean {
  const idx = findBestEmpty(board);
  if (idx === -1) return true;
  for (let v = 1; v <= 9; v++) {
    const cv = v as CellValue;
    if (isValid(board, idx, cv)) {
      board[idx] = cv;
      if (solveMutating(board)) return true;
      board[idx] = 0;
    }
  }
  return false;
}

export function solve(initial: Board): Board | null {
  const board = [...initial] as MutableBoard;
  return solveMutating(board) ? (board as Board) : null;
}

// Count solutions up to `limit`. Used to verify uniqueness (limit = 2).
export function countSolutions(initial: Board, limit = 2): number {
  const board = [...initial] as MutableBoard;
  let count = 0;

  function bt(): void {
    if (count >= limit) return;
    const idx = findEmptyLinear(board);
    if (idx === -1) {
      count++;
      return;
    }
    for (let v = 1; v <= 9; v++) {
      if (count >= limit) return;
      const cv = v as CellValue;
      if (isValid(board, idx, cv)) {
        board[idx] = cv;
        bt();
        board[idx] = 0;
      }
    }
  }

  bt();
  return count;
}

export function hasUniqueSolution(board: Board): boolean {
  return countSolutions(board, 2) === 1;
}
