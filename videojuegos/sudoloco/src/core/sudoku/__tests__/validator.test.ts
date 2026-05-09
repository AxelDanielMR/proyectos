import { validateMove, isValid, isBoardSolved, cellInfo, BOX_CELLS } from '../validator';
import type { Board } from '../types';

const EMPTY: Board = new Array(81).fill(0) as Board;

// A fully solved board (valid).
// prettier-ignore
const SOLVED: Board = [
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

describe('cellInfo', () => {
  it('maps index 0 to row 0, col 0, box 0', () => {
    expect(cellInfo(0)).toEqual({ row: 0, col: 0, box: 0 });
  });
  it('maps index 80 to row 8, col 8, box 8', () => {
    expect(cellInfo(80)).toEqual({ row: 8, col: 8, box: 8 });
  });
  it('maps index 20 to row 2, col 2, box 0', () => {
    expect(cellInfo(20)).toEqual({ row: 2, col: 2, box: 0 });
  });
  it('maps index 40 (center) to row 4, col 4, box 4', () => {
    expect(cellInfo(40)).toEqual({ row: 4, col: 4, box: 4 });
  });
});

describe('BOX_CELLS', () => {
  it('box 0 covers top-left 3x3', () => {
    expect(BOX_CELLS[0]).toEqual([0, 1, 2, 9, 10, 11, 18, 19, 20]);
  });
  it('box 8 covers bottom-right 3x3', () => {
    expect(BOX_CELLS[8]).toEqual([60, 61, 62, 69, 70, 71, 78, 79, 80]);
  });
  it('each box has exactly 9 cells', () => {
    for (const cells of BOX_CELLS) {
      expect(cells).toHaveLength(9);
    }
  });
});

describe('isValid', () => {
  it('returns true on empty board for any value', () => {
    expect(isValid(EMPTY, 0, 5)).toBe(true);
  });

  it('returns false when the same value exists in the same row', () => {
    const board = [...EMPTY] as Board;
    (board as number[])[1] = 5;
    expect(isValid(board, 0, 5)).toBe(false);
  });

  it('returns false when the same value exists in the same column', () => {
    const board = [...EMPTY] as Board;
    (board as number[])[9] = 5; // same col as index 0
    expect(isValid(board, 0, 5)).toBe(false);
  });

  it('returns false when the same value exists in the same box', () => {
    const board = [...EMPTY] as Board;
    (board as number[])[10] = 5; // same box as index 0
    expect(isValid(board, 0, 5)).toBe(false);
  });

  it('returns true when conflicts are in non-peer cells', () => {
    const board = [...EMPTY] as Board;
    (board as number[])[40] = 5; // center, not peer of idx 0
    expect(isValid(board, 0, 5)).toBe(true);
  });
});

describe('validateMove', () => {
  it('returns valid with no conflicts on empty board', () => {
    const result = validateMove(EMPTY, 0, 3);
    expect(result.valid).toBe(true);
    expect(result.conflictsWith).toHaveLength(0);
  });

  it('detects row conflict and lists conflicting index', () => {
    const board = [...EMPTY] as Board;
    (board as number[])[5] = 7; // index 5 same row as index 0
    const result = validateMove(board, 0, 7);
    expect(result.valid).toBe(false);
    expect(result.conflictsWith).toContain(5);
  });

  it('detects multiple conflicts', () => {
    const board = [...EMPTY] as Board;
    (board as number[])[1] = 9;  // row conflict
    (board as number[])[27] = 9; // col conflict (col 0, row 3)
    const result = validateMove(board, 0, 9);
    expect(result.valid).toBe(false);
    expect(result.conflictsWith).toContain(1);
    expect(result.conflictsWith).toContain(27);
  });

  it('placing 0 always returns valid (erasing)', () => {
    const result = validateMove(SOLVED, 0, 0);
    expect(result.valid).toBe(true);
  });
});

describe('isBoardSolved', () => {
  it('returns true when board matches solution', () => {
    expect(isBoardSolved(SOLVED, SOLVED)).toBe(true);
  });

  it('returns false when board is empty', () => {
    expect(isBoardSolved(EMPTY, SOLVED)).toBe(false);
  });

  it('returns false when one cell differs', () => {
    const board = [...SOLVED] as Board;
    (board as number[])[0] = 1; // wrong value
    expect(isBoardSolved(board, SOLVED)).toBe(false);
  });
});
