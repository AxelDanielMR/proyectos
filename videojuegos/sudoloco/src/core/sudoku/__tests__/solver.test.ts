import { solve, countSolutions, hasUniqueSolution } from '../solver';
import type { Board } from '../types';

// Solvable puzzle (17 clues — minimum possible for a unique sudoku).
// prettier-ignore
const PUZZLE_UNIQUE: Board = [
  0,0,0, 0,0,0, 0,0,0,
  0,0,0, 0,0,3, 0,8,5,
  0,0,1, 0,2,0, 0,0,0,
  0,0,0, 5,0,7, 0,0,0,
  0,0,4, 0,0,0, 1,0,0,
  0,9,0, 0,0,0, 0,0,0,
  5,0,0, 0,0,0, 0,7,3,
  0,0,2, 0,1,0, 0,0,0,
  0,0,0, 0,4,0, 0,0,9,
] as Board;

// prettier-ignore
const PUZZLE_UNIQUE_SOLUTION: Board = [
  9,8,7, 6,5,4, 3,2,1,
  2,4,6, 1,7,3, 9,8,5,
  3,5,1, 9,2,8, 7,4,6,
  1,2,8, 5,3,7, 6,9,4,
  6,3,4, 8,9,2, 1,5,7,
  7,9,5, 4,6,1, 8,3,2,
  5,1,9, 2,8,6, 4,7,3,
  4,7,2, 3,1,9, 5,6,8,
  8,6,3, 7,4,5, 2,1,9,
] as Board;

// A board with two solutions (ambiguous — one clue removed from PUZZLE_UNIQUE).
// prettier-ignore
const PUZZLE_AMBIGUOUS: Board = [
  0,0,0, 0,0,0, 0,0,0,
  0,0,0, 0,0,3, 0,8,5,
  0,0,1, 0,2,0, 0,0,0,
  0,0,0, 5,0,7, 0,0,0,
  0,0,4, 0,0,0, 1,0,0,
  0,9,0, 0,0,0, 0,0,0,
  5,0,0, 0,0,0, 0,7,3,
  0,0,2, 0,1,0, 0,0,0,
  0,0,0, 0,0,0, 0,0,9, // removed clue at [76] (was 4)
] as Board;

describe('solve', () => {
  it('solves a valid unique puzzle', () => {
    const solution = solve(PUZZLE_UNIQUE);
    expect(solution).not.toBeNull();
    expect(solution).toEqual(PUZZLE_UNIQUE_SOLUTION);
  });

  it('returns null for an unsolvable board', () => {
    // Cell 0 (row 0, col 0) will have no valid value:
    //   row 0 cells 1-8 hold 1-8 → only 9 would fit
    //   cell 9 (row 1, col 0) holds 9   → col 0 already has 9
    // Therefore no value 1-9 is valid for cell 0 → unsolvable.
    const unsolvable: Board = new Array(81).fill(0) as Board;
    for (let c = 1; c <= 8; c++) (unsolvable as number[])[c] = c as never;
    (unsolvable as number[])[9] = 9 as never;
    expect(solve(unsolvable)).toBeNull();
  });

  it('does not mutate the input board', () => {
    const input = [...PUZZLE_UNIQUE] as Board;
    const snapshot = [...PUZZLE_UNIQUE];
    solve(input);
    expect([...input]).toEqual(snapshot);
  });

  it('returns a complete board (no zeros)', () => {
    const solution = solve(PUZZLE_UNIQUE)!;
    expect(solution.every((v) => v !== 0)).toBe(true);
  });
});

describe('countSolutions', () => {
  it('returns 1 for a unique puzzle', () => {
    expect(countSolutions(PUZZLE_UNIQUE, 2)).toBe(1);
  });

  it('returns ≥ 2 for an ambiguous puzzle', () => {
    expect(countSolutions(PUZZLE_AMBIGUOUS, 2)).toBeGreaterThanOrEqual(2);
  });

  it('respects the limit parameter', () => {
    // Even if there are more, stops at limit.
    const nearly_empty: Board = new Array(81).fill(0) as Board;
    expect(countSolutions(nearly_empty, 1)).toBe(1);
  });
});

describe('hasUniqueSolution', () => {
  it('returns true for a unique puzzle', () => {
    expect(hasUniqueSolution(PUZZLE_UNIQUE)).toBe(true);
  });

  it('returns false for an ambiguous puzzle', () => {
    expect(hasUniqueSolution(PUZZLE_AMBIGUOUS)).toBe(false);
  });
});
