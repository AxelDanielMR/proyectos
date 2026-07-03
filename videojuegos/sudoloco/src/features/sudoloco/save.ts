import { z } from 'zod';
import { createRng, generate, levelConfig, buildPuzzleSeed } from '@core/sudoku';
import type { Board, CellValue, Puzzle, Rng } from '@core/sudoku';

export const SAVE_VERSION = 1 as const;

const cellValueSchema = z.number().int().min(0).max(9);
const noteValueSchema = z.number().int().min(1).max(9);
const cellIndexSchema = z.number().int().min(0).max(80);

export const SavedRunSchema = z.object({
  version: z.literal(SAVE_VERSION),
  savedAt: z.number(),
  seed: z.string(),
  level: z.number().int().min(1),
  lives: z.number().int(),
  crystalHearts: z.number().int().min(0),
  timeRemaining: z.number(),
  score: z.number().int().min(0),
  board: z.array(cellValueSchema).length(81),
  notes: z.array(z.tuple([cellIndexSchema, z.array(noteValueSchema)])),
  errorIndices: z.array(cellIndexSchema),
  hintsRemaining: z.number().int().min(0),
  silverRemaining: z.number().int().min(0),
  goldenRemaining: z.number().int().min(0),
});

export type SavedRun = z.infer<typeof SavedRunSchema>;

export interface SerializeParams {
  run: {
    seed: string;
    level: number;
    lives: number;
    crystalHearts: number;
    timeRemaining: number;
    score: number;
  };
  game: {
    board: Board;
    notesByCell: ReadonlyMap<number, ReadonlySet<CellValue>>;
    errorIndices: ReadonlySet<number>;
    hintsRemaining: number;
    silverRemaining: number;
    goldenRemaining: number;
  };
}

export interface RestoredRun {
  seed: string;
  level: number;
  lives: number;
  crystalHearts: number;
  timeRemaining: number;
  score: number;
  puzzle: Puzzle;
  rng: Rng;
  board: Board;
  notesByCell: Map<number, Set<CellValue>>;
  errorIndices: Set<number>;
  hintsRemaining: number;
  silverRemaining: number;
  goldenRemaining: number;
}

export function serializeRun(params: SerializeParams, now: number): SavedRun {
  const { run, game } = params;
  const notes: [number, number[]][] = [];
  for (const [idx, set] of game.notesByCell) {
    if (set.size > 0) notes.push([idx, [...set]]);
  }
  return {
    version: SAVE_VERSION,
    savedAt: now,
    seed: run.seed,
    level: run.level,
    lives: run.lives,
    crystalHearts: run.crystalHearts,
    timeRemaining: run.timeRemaining,
    score: run.score,
    board: [...game.board],
    notes,
    errorIndices: [...game.errorIndices],
    hintsRemaining: game.hintsRemaining,
    silverRemaining: game.silverRemaining,
    goldenRemaining: game.goldenRemaining,
  };
}

export function deserializeRun(saved: SavedRun): RestoredRun {
  const { difficulty } = levelConfig(saved.level);
  const puzzle = generate(difficulty, buildPuzzleSeed(saved.seed, saved.level));
  const rng = createRng(saved.seed);

  const notesByCell = new Map<number, Set<CellValue>>();
  for (const [idx, values] of saved.notes) {
    notesByCell.set(idx, new Set(values as CellValue[]));
  }

  return {
    seed: saved.seed,
    level: saved.level,
    lives: saved.lives,
    crystalHearts: saved.crystalHearts,
    timeRemaining: saved.timeRemaining,
    score: saved.score,
    puzzle,
    rng,
    board: saved.board as unknown as Board,
    notesByCell,
    errorIndices: new Set(saved.errorIndices),
    hintsRemaining: saved.hintsRemaining,
    silverRemaining: saved.silverRemaining,
    goldenRemaining: saved.goldenRemaining,
  };
}
