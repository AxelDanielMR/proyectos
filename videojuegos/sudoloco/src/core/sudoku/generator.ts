import type { Board, CellValue, Difficulty, Puzzle } from './types';
import type { Rng } from './prng';
import { createRng, shuffled } from './prng';
import { isValid } from './validator';
import { countSolutions } from './solver';
import { getClueCount, getClueRange } from './difficulty';

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

function countClues(board: Board): number {
  return board.reduce<number>(
    (total, value) => total + (value !== 0 ? 1 : 0),
    0,
  );
}

// A single dig pass over one solution grid can stall short of `toRemove`:
// once a cell's removal would break uniqueness for the *current* board, it
// stays filled — and retrying it later, after other cells are already gone,
// only makes that harder (fewer filled cells means more room for an
// alternate solution), never easier. So instead of reordering the same
// grid, we regenerate a fresh solution grid from a derived seed and dig
// again, keeping the best (closest-to-target) attempt in case every retry
// misses the range.
const MAX_GENERATE_ATTEMPTS = 20;

export function generate(difficulty: Difficulty, seed: string): Puzzle {
  const { min, max } = getClueRange(difficulty);

  let best: { initial: Board; solution: Board } | null = null;
  let bestDistance = Infinity;

  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const attemptSeed = attempt === 0 ? seed : `${seed}#${attempt}`;
    const rng = createRng(attemptSeed);
    const solution = generateSolution(rng);
    const clueCount = getClueCount(difficulty, rng);
    const initial = removeCells(solution, 81 - clueCount, rng);

    const actualClues = countClues(initial);
    if (actualClues >= min && actualClues <= max) {
      return { seed, difficulty, initial, solution };
    }

    const distance = actualClues < min ? min - actualClues : actualClues - max;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { initial, solution };
    }
  }

  // Every attempt missed the target range — return the closest one rather
  // than silently accepting whatever the last attempt happened to produce.
  return { seed, difficulty, initial: best!.initial, solution: best!.solution };
}
