import { createStore } from 'zustand/vanilla';
import type { Board, CellValue, Puzzle } from '@core/sudoku';
import {
  detectBoxCompletion,
  isBoardSolved,
  pickHintCell,
  revealCandidate,
  revealGoldenCell,
} from '@core/sudoku';
import type { SudokuGameOptions, SudokuGameCallbacks } from './types';

export interface SudokuGameState {
  puzzle: Puzzle;
  board: Board;
  selectedIndex: number | null;
  notesByCell: ReadonlyMap<number, ReadonlySet<CellValue>>;
  errorIndices: ReadonlySet<number>;
  hintsRemaining: number;
  goldenRemaining: number;
  isNotesMode: boolean;
  isComplete: boolean;
}

export interface SudokuGameActions {
  select(idx: number | null): void;
  place(value: CellValue): void;
  toggleNote(value: CellValue): void;
  toggleNotesMode(): void;
  erase(): void;
  useHint(): void;
  useGoldenCell(): void;
  grantHints(n: number): void;
  grantGoldenCells(n: number): void;
}

export type SudokuGameStore = ReturnType<typeof createSudokuGameStore>;

export function createSudokuGameStore(opts: SudokuGameOptions) {
  const { puzzle, rng, callbacks } = opts;

  return createStore<SudokuGameState & SudokuGameActions>()((set, get) => ({
    puzzle,
    board: puzzle.initial,
    selectedIndex: null,
    notesByCell: new Map(),
    errorIndices: new Set(),
    hintsRemaining: opts.initialHints ?? 0,
    goldenRemaining: opts.initialGoldenCells ?? 0,
    isNotesMode: false,
    isComplete: false,

    select(idx) {
      set({ selectedIndex: idx });
    },

    place(value) {
      const { selectedIndex, board, isComplete } = get();
      if (selectedIndex === null || isComplete) return;
      if (puzzle.initial[selectedIndex] !== 0) return;
      if (board[selectedIndex] === puzzle.solution[selectedIndex]) return;

      const newBoard = [...board] as CellValue[];
      newBoard[selectedIndex] = value;
      const nextBoard = newBoard as unknown as Board;

      const newErrors = new Set(get().errorIndices);
      const isCorrect = value === puzzle.solution[selectedIndex];

      if (isCorrect) {
        newErrors.delete(selectedIndex);
        const newNotes = new Map(get().notesByCell);
        newNotes.delete(selectedIndex);

        const completedBox = detectBoxCompletion(board, nextBoard, puzzle.solution);
        const solved = isBoardSolved(nextBoard, puzzle.solution);

        set({
          board: nextBoard,
          errorIndices: newErrors,
          notesByCell: newNotes,
          isComplete: solved,
        });

        callbacks?.onCellCorrect?.(selectedIndex, value);
        if (completedBox !== null) callbacks?.onBoxComplete?.(completedBox);
        if (solved) callbacks?.onPuzzleComplete?.();
      } else {
        newErrors.add(selectedIndex);
        set({ board: nextBoard, errorIndices: newErrors });
        callbacks?.onCellIncorrect?.(selectedIndex, value);
      }
    },

    toggleNote(value) {
      const { selectedIndex, board, isNotesMode } = get();
      if (selectedIndex === null || !isNotesMode) return;
      if (puzzle.initial[selectedIndex] !== 0) return;
      if (board[selectedIndex] !== 0) return;

      const newNotes = new Map(get().notesByCell);
      const cellNotes = new Set(newNotes.get(selectedIndex) ?? []);
      if (cellNotes.has(value)) {
        cellNotes.delete(value);
      } else {
        cellNotes.add(value);
      }
      newNotes.set(selectedIndex, cellNotes);
      set({ notesByCell: newNotes });
    },

    toggleNotesMode() {
      set((s) => ({ isNotesMode: !s.isNotesMode }));
    },

    erase() {
      const { selectedIndex, board } = get();
      if (selectedIndex === null) return;
      if (puzzle.initial[selectedIndex] !== 0) return;

      const newBoard = [...board] as CellValue[];
      newBoard[selectedIndex] = 0;

      const newErrors = new Set(get().errorIndices);
      newErrors.delete(selectedIndex);

      const newNotes = new Map(get().notesByCell);
      newNotes.delete(selectedIndex);

      set({
        board: newBoard as unknown as Board,
        errorIndices: newErrors,
        notesByCell: newNotes,
      });
    },

    useHint() {
      const { hintsRemaining, board, selectedIndex } = get();
      if (hintsRemaining <= 0) return;

      // Prefer the currently selected unsolved cell; fall back to auto-pick.
      let targetIdx: number;
      if (
        selectedIndex !== null &&
        puzzle.initial[selectedIndex] === 0 &&
        board[selectedIndex] !== puzzle.solution[selectedIndex]
      ) {
        targetIdx = selectedIndex;
      } else {
        targetIdx = pickHintCell(board, puzzle.solution, rng);
        if (targetIdx === -1) return;
      }

      const candidates = revealCandidate(board, puzzle.solution, targetIdx);
      if (candidates.length === 0) return;

      const newNotes = new Map(get().notesByCell);
      const existing = new Set(newNotes.get(targetIdx) ?? []);
      for (const v of candidates) existing.add(v);
      newNotes.set(targetIdx, existing);

      set({ notesByCell: newNotes, hintsRemaining: hintsRemaining - 1 });
    },

    useGoldenCell() {
      const { goldenRemaining, board } = get();
      if (goldenRemaining <= 0) return;

      const result = revealGoldenCell(board, puzzle.solution, rng);
      if (result === null) return;

      const newBoard = [...board] as CellValue[];
      newBoard[result.idx] = result.value;
      const nextBoard = newBoard as unknown as Board;

      const newErrors = new Set(get().errorIndices);
      newErrors.delete(result.idx);
      const newNotes = new Map(get().notesByCell);
      newNotes.delete(result.idx);

      const completedBox = detectBoxCompletion(board, nextBoard, puzzle.solution);
      const solved = isBoardSolved(nextBoard, puzzle.solution);

      set({
        board: nextBoard,
        errorIndices: newErrors,
        notesByCell: newNotes,
        goldenRemaining: goldenRemaining - 1,
        isComplete: solved,
      });

      callbacks?.onCellCorrect?.(result.idx, result.value);
      if (completedBox !== null) callbacks?.onBoxComplete?.(completedBox);
      if (solved) callbacks?.onPuzzleComplete?.();
    },

    grantHints(n) {
      set((s) => ({ hintsRemaining: s.hintsRemaining + n }));
    },

    grantGoldenCells(n) {
      set((s) => ({ goldenRemaining: s.goldenRemaining + n }));
    },
  }));
}

// Re-export callbacks type for consumers
export type { SudokuGameCallbacks };
