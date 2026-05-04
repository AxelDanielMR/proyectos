import type { ComponentType } from 'react';

export type MicrogameResult = 'win' | 'lose' | 'timeout';

export interface MicrogameProps {
  onResult: (result: MicrogameResult) => void;
}

export interface Microgame {
  readonly id: string;
  readonly name: string;
  readonly durationMs: number;
  readonly Component: ComponentType<MicrogameProps>;
}

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

export function listMicrogames(): readonly Microgame[] {
  return Array.from(registry.values());
}
