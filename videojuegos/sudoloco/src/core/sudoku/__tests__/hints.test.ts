import { revealCandidate, pickHintCell, revealGoldenCell } from '../hints';
import type { Board } from '../types';

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

const emptyBoard: Board = new Array(81).fill(0) as Board;

// Always returns 0 — picks first candidate.
const firstRng = () => 0;

describe('revealCandidate', () => {
  it('returns the correct solution value for an empty cell', () => {
    expect(revealCandidate(emptyBoard, SOLUTION, 0)).toEqual([5]);
  });

  it('returns empty array when the cell is already solved', () => {
    expect(revealCandidate(SOLUTION, SOLUTION, 0)).toEqual([]);
  });

  it('returns the correct value even when cell has a wrong value', () => {
    const board = [...emptyBoard] as unknown as number[];
    board[0] = 3;
    expect(revealCandidate(board as Board, SOLUTION, 0)).toEqual([5]);
  });
});

describe('pickHintCell', () => {
  it('returns a valid unsolved cell index', () => {
    const idx = pickHintCell(emptyBoard, SOLUTION, firstRng);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(81);
    expect(emptyBoard[idx]).toBe(0);
  });

  it('returns -1 when the board is already complete', () => {
    expect(pickHintCell(SOLUTION, SOLUTION, firstRng)).toBe(-1);
  });

  it('only picks from unsolved cells', () => {
    const board = [...SOLUTION] as unknown as number[];
    board[0] = 0;
    const result = pickHintCell(board as Board, SOLUTION, firstRng);
    expect(result).toBe(0);
  });

  it('with all 81 cells empty, returns a valid index', () => {
    const idx = pickHintCell(emptyBoard, SOLUTION, firstRng);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(81);
  });
});

describe('revealGoldenCell', () => {
  it('returns idx and value for an unsolved board', () => {
    const result = revealGoldenCell(emptyBoard, SOLUTION, firstRng);
    expect(result).not.toBeNull();
    expect(result!.idx).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBe(SOLUTION[result!.idx]);
  });

  it('returns null when the board is complete', () => {
    expect(revealGoldenCell(SOLUTION, SOLUTION, firstRng)).toBeNull();
  });

  it('the returned value matches the solution at the returned index', () => {
    const result = revealGoldenCell(emptyBoard, SOLUTION, () => 0.5);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(SOLUTION[result!.idx]);
  });
});
