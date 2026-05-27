import { useStore } from 'zustand/react';
import { useShallow } from 'zustand/react/shallow';
import type { SudokuGameStore } from './store';

const EMPTY_NOTES: ReadonlySet<number> = new Set();

// Fine-grained per-cell selector: only re-renders the Cell that actually changed.
export function useCellState(store: SudokuGameStore, idx: number) {
  return useStore(
    store,
    useShallow((s) => ({
      value: s.board[idx] ?? 0,
      isFixed: s.puzzle.initial[idx] !== 0,
      isSelected: s.selectedIndex === idx,
      isError: s.errorIndices.has(idx),
      notes: s.notesByCell.get(idx) ?? EMPTY_NOTES,
    })),
  );
}

export function useSudokuGameState(store: SudokuGameStore) {
  return useStore(
    store,
    useShallow((s) => ({
      selectedIndex: s.selectedIndex,
      isNotesMode: s.isNotesMode,
      hintsRemaining: s.hintsRemaining,
      goldenRemaining: s.goldenRemaining,
      isComplete: s.isComplete,
    })),
  );
}

export function useSudokuGameActions(store: SudokuGameStore) {
  return useStore(store, useShallow((s) => ({
    select: s.select,
    place: s.place,
    toggleNote: s.toggleNote,
    toggleNotesMode: s.toggleNotesMode,
    erase: s.erase,
    useHint: s.useHint,
    useGoldenCell: s.useGoldenCell,
    grantHints: s.grantHints,
    grantGoldenCells: s.grantGoldenCells,
  })));
}
