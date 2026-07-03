import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { SudokuGameStore } from '@ui/SudokuGame';
import { useSudolocoStore } from './store';
import { serializeRun } from './save';
import { persistSave } from './save.storage';

const SAVEABLE_PHASES = new Set(['playing', 'paused', 'microgame', 'between_levels']);
const THROTTLE_MS = 2000;

/**
 * Toma un snapshot del run store + game store y lo persiste. Devuelve `true` si
 * guardó, `false` si la fase no es guardable. Usado por el autosave y por el
 * botón manual "Guardar" de la pausa.
 */
export function snapshotSave(gameStore: SudokuGameStore): boolean {
  const run = useSudolocoStore.getState();
  if (!SAVEABLE_PHASES.has(run.phase)) return false;
  const game = gameStore.getState();
  void persistSave(
    serializeRun(
      {
        run: {
          seed: run.seed,
          level: run.level,
          lives: run.lives,
          crystalHearts: run.crystalHearts,
          timeRemaining: run.timeRemaining,
          score: run.score,
        },
        game: {
          board: game.board,
          notesByCell: game.notesByCell,
          errorIndices: game.errorIndices,
          hintsRemaining: game.hintsRemaining,
          silverRemaining: game.silverRemaining,
          goldenRemaining: game.goldenRemaining,
        },
      },
      Date.now(),
    ),
  );
  return true;
}

export function useAutoSave(gameStore: SudokuGameStore | null): void {
  const lastSaveRef = useRef(0);

  useEffect(() => {
    if (!gameStore) return;

    const snapshot = () => {
      snapshotSave(gameStore);
    };

    const throttledSave = () => {
      const now = Date.now();
      if (now - lastSaveRef.current < THROTTLE_MS) return;
      lastSaveRef.current = now;
      snapshot();
    };

    const unsubRun = useSudolocoStore.subscribe(throttledSave);
    const unsubGame = gameStore.subscribe(throttledSave);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        useSudolocoStore.getState().pauseRun();
        lastSaveRef.current = Date.now();
        snapshot(); // guardado forzado inmediato: captura el timer exacto
      }
    });

    return () => {
      unsubRun();
      unsubGame();
      sub.remove();
    };
  }, [gameStore]);
}
