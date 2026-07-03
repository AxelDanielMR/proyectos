import { generate, buildPuzzleSeed } from '@core/sudoku';
import type { Board, CellValue } from '@core/sudoku';
import {
  SavedRunSchema,
  serializeRun,
  deserializeRun,
  SAVE_VERSION,
} from '@features/sudoloco/save';

function sampleParams() {
  const seed = 'seed-123';
  const level = 4;
  const puzzle = generate('intermediate', buildPuzzleSeed(seed, level));
  const board = [...puzzle.initial] as CellValue[];
  const emptyIdx = board.findIndex((v) => v === 0);
  board[emptyIdx] = 7 as CellValue;
  return {
    seed,
    level,
    emptyIdx,
    params: {
      run: {
        seed,
        level,
        lives: 2,
        crystalHearts: 1,
        timeRemaining: 143,
        score: 1250,
      },
      game: {
        board: board as unknown as Board,
        notesByCell: new Map<number, ReadonlySet<CellValue>>([
          [emptyIdx, new Set<CellValue>([3, 4])],
        ]),
        errorIndices: new Set<number>([emptyIdx]),
        hintsRemaining: 1,
        silverRemaining: 0,
        goldenRemaining: 2,
      },
    },
  };
}

describe('serializeRun / deserializeRun', () => {
  it('produce un SavedRun válido según el schema', () => {
    const { params } = sampleParams();
    const saved = serializeRun(params, 1_700_000_000_000);
    expect(saved.version).toBe(SAVE_VERSION);
    expect(saved.savedAt).toBe(1_700_000_000_000);
    expect(SavedRunSchema.safeParse(saved).success).toBe(true);
  });

  it('round-trip preserva meta, tablero, notas, errores y powerups restantes', () => {
    const { params, emptyIdx } = sampleParams();
    const saved = serializeRun(params, 1);
    const restored = deserializeRun(saved);

    expect(restored.level).toBe(4);
    expect(restored.lives).toBe(2);
    expect(restored.crystalHearts).toBe(1);
    expect(restored.timeRemaining).toBe(143);
    expect(restored.score).toBe(1250);
    expect(restored.board[emptyIdx]).toBe(7);
    expect([...(restored.notesByCell.get(emptyIdx) ?? [])]).toEqual([3, 4]);
    expect(restored.errorIndices.has(emptyIdx)).toBe(true);
    expect(restored.hintsRemaining).toBe(1);
    expect(restored.silverRemaining).toBe(0);
    expect(restored.goldenRemaining).toBe(2);
  });

  it('regenera el mismo puzzle determinista (initial + solution)', () => {
    const { params, seed, level } = sampleParams();
    const saved = serializeRun(params, 1);
    const restored = deserializeRun(saved);
    const expected = generate('intermediate', buildPuzzleSeed(seed, level));
    expect(restored.puzzle.initial).toEqual(expected.initial);
    expect(restored.puzzle.solution).toEqual(expected.solution);
  });

  it('el schema rechaza versión desconocida', () => {
    const { params } = sampleParams();
    const saved = serializeRun(params, 1);
    const bad = { ...saved, version: 99 };
    expect(SavedRunSchema.safeParse(bad).success).toBe(false);
  });

  it('el schema rechaza un tablero de longitud incorrecta', () => {
    const { params } = sampleParams();
    const saved = serializeRun(params, 1);
    const bad = { ...saved, board: saved.board.slice(0, 80) };
    expect(SavedRunSchema.safeParse(bad).success).toBe(false);
  });
});
