import type React from 'react';
import type { Rng } from '@core/sudoku';

export type MicrogameCategory =
  | 'drag-match'
  | 'tap-timing'
  | 'tap-targets'
  | 'tap-spam'
  | 'dodge'
  | 'reveal'
  | 'flick'
  | 'sequence'
  | 'inverse';

export type MicrogameResult = 'win' | 'lose';

/** Descriptor visual de una entidad. Hoy usamos emoji; el arte final usará `source`. */
export interface Visual {
  emoji?: string;
  source?: number; // require() de imagen/sprite
  label?: string;
}

export interface MicrogameProps {
  /** 0..1; el juego lo interpreta con su propia curva. */
  difficulty: number;
  /** PRNG sembrado de la run — contenido determinista/testeable. */
  rng: Rng;
  /** El juego reporta victoria/derrota anticipada. El timeout lo maneja el runner. */
  onResult: (result: MicrogameResult) => void;
}

export interface Microgame {
  id: string;
  nameKey: string; // clave i18n, nunca literal
  category: MicrogameCategory;
  minLevel: number; // aparece a partir de este nivel de run
  durationMs: number; // límite; timeout = lose
  Component: React.FC<MicrogameProps>;
  thumbnail?: number; // require() para el menú (fase posterior)
}
