import { computeProgress, detectBoxCompletion } from '../progress';
import type { Board, Puzzle } from '../types';

// prettier-ignore
const SOLUTION: Board = [
  5,3,4, 6,7,8, 9,1,2,
  6,7,2, 1,9,5, 3,4,8,
  1,9,8, 3,4,2, 5,6,7,
  8,5,9, 7,6,1, 4,2,3,
  4,2,6, 8,5,3, 7,9,1,
  7,1,3, 9,2,4, 8,5,6,
  9,6,1, 5,3,7, 2,8,4,
  2,8,7, 4,1,9, 6,3,5,
  3,4,5, 2,8,6, 1,7,9,
] as Board;

// Puzzle with one missing cell per row for testing (9 empty cells in box 0).
function makePuzzle(initial: Board): Puzzle {
  return { seed: 'test', difficulty: 'beginner', initial, solution: SOLUTION };
}

describe('computeProgress', () => {
  it('returns 0 when no empty cells are filled', () => {
    // initial = solution except box 0 cells are empty
    const initial = [...SOLUTION] as Board;
    // Empty the first 9 cells (box 0 + some others, doesn't matter).
    for (let i = 0; i < 9; i++) (initial as number[])[i] = 0;
    const board = [...initial] as Board; // user hasn't filled anything
    const puzzle = makePuzzle(initial);
    expect(computeProgress(board, puzzle)).toBe(0);
  });

  it('returns 100 when all empty cells are correctly filled', () => {
    const initial = [...SOLUTION] as Board;
    for (let i = 0; i < 9; i++) (initial as number[])[i] = 0;
    const puzzle = makePuzzle(initial);
    // board = solution (all filled correctly)
    expect(computeProgress(SOLUTION, puzzle)).toBe(100);
  });

  it('returns ~50 when half the empty cells are filled', () => {
    const initial = [...SOLUTION] as Board;
    for (let i = 0; i < 10; i++) (initial as number[])[i] = 0; // 10 empty
    const puzzle = makePuzzle(initial);
    const board = [...initial] as Board;
    // fill 5 of 10 correctly
    for (let i = 0; i < 5; i++) (board as number[])[i] = SOLUTION[i]!;
    expect(computeProgress(board, puzzle)).toBe(50);
  });

  it('returns 100 when the puzzle has no empty cells', () => {
    const puzzle = makePuzzle(SOLUTION);
    expect(computeProgress(SOLUTION, puzzle)).toBe(100);
  });

  it('does not count incorrectly placed values as progress', () => {
    const initial = [...SOLUTION] as Board;
    (initial as number[])[0] = 0;
    const puzzle = makePuzzle(initial);
    const board = [...initial] as Board;
    (board as number[])[0] = 9; // wrong value
    expect(computeProgress(board, puzzle)).toBe(0);
  });
});

describe('detectBoxCompletion', () => {
  it('returns null when no new box is completed', () => {
    const empty: Board = new Array(81).fill(0) as Board;
    expect(detectBoxCompletion(empty, empty, SOLUTION)).toBeNull();
  });

  it('detects box 0 completion', () => {
    // prev: box 0 has 8/9 cells correct
    const prev = [...SOLUTION] as Board;
    (prev as number[])[0] = 0; // leave one empty

    // next: box 0 fully complete
    const next = [...SOLUTION] as Board;

    expect(detectBoxCompletion(prev, next, SOLUTION)).toBe(0);
  });

  it('ignores boxes that were already complete', () => {
    // Both prev and next have box 0 complete — should not trigger.
    const prev = [...SOLUTION] as Board;
    const next = [...SOLUTION] as Board;
    // Make some other change (not completing a new box).
    (next as number[])[40] = 0; // remove center cell

    expect(detectBoxCompletion(prev, next, SOLUTION)).toBeNull();
  });

  it('detects box 8 (bottom-right) completion', () => {
    const prev = [...SOLUTION] as Board;
    (prev as number[])[80] = 0;
    const next = [...SOLUTION] as Board;
    expect(detectBoxCompletion(prev, next, SOLUTION)).toBe(8);
  });
});
