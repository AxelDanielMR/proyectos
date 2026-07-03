import type { Rng } from '@core/sudoku';
import type { Microgame } from './types';

/** Mapea el nivel de la run a dificultad normalizada 0..1 (satura hacia nivel 20). */
export function levelToDifficulty(level: number): number {
  const d = (level - 1) / 19;
  return Math.max(0, Math.min(1, d));
}

/**
 * Elige un microjuego elegible (minLevel <= level), prefiriendo los no descubiertos.
 * Determinista dado `rng`. Devuelve null si no hay ninguno elegible.
 */
export function pickMicrogame(
  games: Microgame[],
  level: number,
  discoveredIds: ReadonlySet<string>,
  rng: Rng,
): Microgame | null {
  const eligible = games.filter((g) => g.minLevel <= level);
  if (eligible.length === 0) return null;

  const undiscovered = eligible.filter((g) => !discoveredIds.has(g.id));
  const pool = undiscovered.length > 0 ? undiscovered : eligible;

  const idx = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
  return pool[idx] ?? null;
}
