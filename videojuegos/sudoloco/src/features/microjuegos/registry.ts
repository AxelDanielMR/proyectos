import type { Microgame } from './types';

const registry = new Map<string, Microgame>();

export function registerMicrogame(game: Microgame): void {
  if (registry.has(game.id)) {
    throw new Error(`Microgame already registered: ${game.id}`);
  }
  registry.set(game.id, game);
}

export function getMicrogame(id: string): Microgame | undefined {
  return registry.get(id);
}

export function listMicrogames(): Microgame[] {
  return [...registry.values()];
}

/** Solo para tests. */
export function _clearRegistry(): void {
  registry.clear();
}
