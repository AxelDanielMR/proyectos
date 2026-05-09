import type { Board, CellValue, Difficulty, Puzzle } from './types';
import type { Rng } from './prng';
import { createRng, shuffled } from './prng';
import { isValid } from './validator';
import { countSolutions } from './solver';
import { getClueCount } from './difficulty';

type MutableBoard = CellValue[];

const CANDIDATES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function fillSolution(board: MutableBoard, rng: Rng): boolean {
  let emptyIdx = -1;
  for (let i = 0; i < 81; i++) {
    if (board[i] === 0) {
      emptyIdx = i;
      break;
    }
  }
  if (emptyIdx === -1) return true; // full board

  const values = shuffled(CANDIDATES, rng);
  for (const v of values) {
    if (isValid(board, emptyIdx, v)) {
      board[emptyIdx] = v;
      if (fillSolution(board, rng)) return true;
      board[emptyIdx] = 0;
    }
  }
  return false;
}

function generateSolution(rng: Rng): Board {
  const board: MutableBoard = new Array<CellValue>(81).fill(0 as CellValue);
  fillSolution(board, rng);
  return board as Board;
}

function removeCells(solution: Board, toRemove: number, rng: Rng): Board {
  const board = [...solution] as MutableBoard;
  const indices = shuffled(
    Array.from({ length: 81 }, (_, i) => i),
    rng,
  );

  let removed = 0;
  for (const idx of indices) {
    if (removed >= toRemove) break;
    const backup = board[idx]!;
    board[idx] = 0;

    // Accept removal only if the puzzle still has exactly one solution.
    if (countSolutions(board, 2) === 1) {
      removed++;
    } else {
      board[idx] = backup;
    }
  }

  return board as Board;
}

export function generate(difficulty: Difficulty, seed: string): Puzzle {
  const rng = createRng(seed);
  const solution = generateSolution(rng);
  const clueCount = getClueCount(difficulty, rng);
  const initial = removeCells(solution, 81 - clueCount, rng);
  return { seed, difficulty, initial, solution };
}
