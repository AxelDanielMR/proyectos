import type { Board, CellValue } from './types';
import type { Rng } from './prng';

// Returns the correct value(s) that should be noted for a given cell.
// In practice this is always [solution[idx]] for non-fixed unsolved cells.
export function revealCandidate(
  board: Board,
  solution: Board,
  idx: number,
): CellValue[] {
  const correct = solution[idx];
  if (correct === undefined || correct === 0) return [];
  if (board[idx] === correct) return [];
  return [correct];
}

// Picks the index of an unsolved cell to use as a hint target.
// Returns -1 if the board is already complete.
export function pickHintCell(board: Board, solution: Board, rng: Rng): number {
  const candidates: number[] = [];
  for (let i = 0; i < 81; i++) {
    const sol = solution[i];
    if (sol !== undefined && sol !== 0 && board[i] !== sol) {
      candidates.push(i);
    }
  }
  if (candidates.length === 0) return -1;
  return candidates[Math.floor(rng() * candidates.length)]!;
}

// Reveals the exact value for a randomly chosen unsolved cell.
// Returns null if the board is already complete.
export function revealGoldenCell(
  board: Board,
  solution: Board,
  rng: Rng,
): { idx: number; value: CellValue } | null {
  const idx = pickHintCell(board, solution, rng);
  if (idx === -1) return null;
  return { idx, value: solution[idx] as CellValue };
}
