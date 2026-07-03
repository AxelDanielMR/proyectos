import { createRng, generate } from '@core/sudoku';
import type { Board, CellValue } from '@core/sudoku';
import { createSudokuGameStore } from '../store';

function makeStore(overrides: Partial<Parameters<typeof createSudokuGameStore>[0]> = {}) {
  const puzzle = generate('beginner', 'restore-seed:1');
  const rng = createRng('restore-seed');
  return createSudokuGameStore({ puzzle, rng, ...overrides });
}

describe('createSudokuGameStore rehidratación', () => {
  it('sin initialBoard usa puzzle.initial', () => {
    const store = makeStore();
    const puzzle = generate('beginner', 'restore-seed:1');
    expect(store.getState().board).toEqual(puzzle.initial);
    expect(store.getState().isComplete).toBe(false);
  });

  it('con initialBoard rehidrata tablero, notas y errores', () => {
    const puzzle = generate('beginner', 'restore-seed:1');
    const board = [...puzzle.initial] as CellValue[];
    const emptyIdx = board.findIndex((v) => v === 0);
    board[emptyIdx] = 5 as CellValue;
    const notes = new Map<number, ReadonlySet<CellValue>>([[emptyIdx, new Set<CellValue>([1, 2])]]);
    const errorIndices = new Set<number>([emptyIdx]);

    const store = makeStore({
      initialBoard: board as unknown as Board,
      initialNotes: notes,
      initialErrorIndices: errorIndices,
      initialHints: 2,
    });

    expect(store.getState().board[emptyIdx]).toBe(5);
    expect([...(store.getState().notesByCell.get(emptyIdx) ?? [])]).toEqual([1, 2]);
    expect(store.getState().errorIndices.has(emptyIdx)).toBe(true);
    expect(store.getState().hintsRemaining).toBe(2);
    expect(store.getState().isComplete).toBe(false);
  });

  it('con initialBoard igual a la solución marca isComplete', () => {
    const puzzle = generate('beginner', 'restore-seed:1');
    const store = makeStore({ initialBoard: puzzle.solution });
    expect(store.getState().isComplete).toBe(true);
  });
});
