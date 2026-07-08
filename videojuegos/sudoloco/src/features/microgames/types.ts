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
  /**
   * El juego ya decidió el resultado y está reproduciendo su propia animación
   * antes de llamar `onResult`. Congela el timer del runner para que un timeout
   * no pise una decisión ya tomada durante esa espera.
   */
  onReveal?: () => void;
}

/** Paso del guion de instrucciones: qué mano mostrar, si hay partículas y cómo se mueve. */
export interface InstructionStep {
  hand: 'pointer' | 'clicking';
  particles?: boolean;
  /** Desplazamiento relativo (px) animado durante el paso. */
  move?: { dx: number; dy: number };
  durationMs: number;
}

export interface Microgame {
  id: string;
  nameKey: string; // clave i18n, nunca literal
  category: MicrogameCategory;
  minLevel: number; // aparece a partir de este nivel de run
  durationMs: number; // límite; timeout = lose
  Component: React.FC<MicrogameProps>;
  thumbnail?: number; // require() para el menú (fase posterior)
  /** Guion del bucle de instrucciones (InstructionHint). Sin guion = sin overlay. */
  instructions?: InstructionStep[];
  /**
   * El juego ya muestra su propia animación de victoria/derrota (delay interno
   * antes de invocar onResult). El runner no superpone VerdictReaction encima.
   */
  hasOwnReveal?: boolean;
  /** width/height del stage (MicrogameStage). Por defecto 3/4; úsalo cuando el
   * juego tiene fondo propio y no quieres que se recorte. */
  stageAspectRatio?: number;
}
