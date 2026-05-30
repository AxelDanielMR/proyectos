import { createStore } from 'zustand/vanilla';
import type { Board, CellValue, Puzzle } from '@core/sudoku';
import {
  detectBoxCompletion,
  isBoardSolved,
  pickHintCell,
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
  silverRemaining: number;
  goldenRemaining: number;
  isGoldenMode: boolean;
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
  useSilverCell(): void;
  useGoldenCell(): void;
  cancelGoldenMode(): void;
  grantHints(n: number): void;
  grantSilverCells(n: number): void;
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
    silverRemaining: opts.initialSilverCells ?? 0,
    goldenRemaining: opts.initialGoldenCells ?? 0,
    isGoldenMode: false,
    isNotesMode: false,
    isComplete: false,

    select(idx) {
      const { isGoldenMode, board, isComplete } = get();

      if (isGoldenMode && idx !== null) {
        // Golden mode: reveal the tapped cell if valid
        if (
          !isComplete &&
          puzzle.initial[idx] === 0 &&
          board[idx] !== puzzle.solution[idx]
        ) {
          const value = puzzle.solution[idx] as CellValue;
          const newBoard = [...board] as CellValue[];
          newBoard[idx] = value;
          const nextBoard = newBoard as unknown as Board;

          const newErrors = new Set(get().errorIndices);
          newErrors.delete(idx);
          const newNotes = new Map(get().notesByCell);
          newNotes.delete(idx);

          const completedBox = detectBoxCompletion(board, nextBoard, puzzle.solution);
          const solved = isBoardSolved(nextBoard, puzzle.solution);

          set({
            board: nextBoard,
            errorIndices: newErrors,
            notesByCell: newNotes,
            selectedIndex: idx,
            isGoldenMode: false,
            isComplete: solved,
          });

          callbacks?.onCellCorrect?.(idx, value);
          if (solved) callbacks?.onPuzzleComplete?.();
          else if (completedBox !== null) callbacks?.onBoxComplete?.(completedBox);
        } else {
          // Tap on fixed/correct cell cancels golden mode
          set({ isGoldenMode: false, selectedIndex: idx });
        }
        return;
      }

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
        if (solved) callbacks?.onPuzzleComplete?.();
        else if (completedBox !== null) callbacks?.onBoxComplete?.(completedBox);
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
      if (board[selectedIndex] === puzzle.solution[selectedIndex]) return;

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

    // Subtle hint: just selects the cell most in need of attention.
    useHint() {
      const { hintsRemaining, board, selectedIndex } = get();
      if (hintsRemaining <= 0) return;

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

      set({ selectedIndex: targetIdx, hintsRemaining: hintsRemaining - 1 });
    },

    // Silver cell: auto-reveals a random unsolved cell.
    useSilverCell() {
      const { silverRemaining, board } = get();
      if (silverRemaining <= 0) return;

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
        silverRemaining: silverRemaining - 1,
        isComplete: solved,
      });

      callbacks?.onCellCorrect?.(result.idx, result.value);
      if (solved) callbacks?.onPuzzleComplete?.();
      else if (completedBox !== null) callbacks?.onBoxComplete?.(completedBox);
    },

    // Golden cell: activates interactive mode — next cell tap reveals it.
    useGoldenCell() {
      const { goldenRemaining } = get();
      if (goldenRemaining <= 0) return;
      set({ isGoldenMode: true, goldenRemaining: goldenRemaining - 1 });
    },

    cancelGoldenMode() {
      set({ isGoldenMode: false });
    },

    grantHints(n) {
      set((s) => ({ hintsRemaining: s.hintsRemaining + n }));
    },

    grantSilverCells(n) {
      set((s) => ({ silverRemaining: s.silverRemaining + n }));
    },

    grantGoldenCells(n) {
      set((s) => ({ goldenRemaining: s.goldenRemaining + n }));
    },
  }));
}

export type { SudokuGameCallbacks };
