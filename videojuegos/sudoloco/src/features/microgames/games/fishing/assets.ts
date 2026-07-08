import type { Visual } from '../../types';

// Fondo, personaje y frames de animación comparten el mismo lienzo (160x256, PNG
// transparente) — se apilan directamente uno encima de otro, sin calcular
// posiciones: el arte ya viene alineado.
export const BACKGROUND: number = require('../../../../../assets/microgames/fishing/fishing_background.png');
export const CHARACTER: number = require('../../../../../assets/microgames/fishing/fishing_character.png');

/** Rebote de derrota (gotita de sudor) cuando se acaba el tiempo sin atrapar el pez. */
export const CHARACTER_LOSE_FRAMES: [number, number] = [
  require('../../../../../assets/microgames/fishing/fishing_character_lose1.png'),
  require('../../../../../assets/microgames/fishing/fishing_character_lose2.png'),
];

/** Loop de "pique" que indica que hay que tapear rápido. Solo 1-3: el frame 4 del
 * arte original queda sin usar por ahora. */
export const BITE_LOOP_FRAMES: number[] = [
  require('../../../../../assets/microgames/fishing/fishing_animation1.png'),
  require('../../../../../assets/microgames/fishing/fishing_animation2.png'),
  require('../../../../../assets/microgames/fishing/fishing_animation3.png'),
];

// Placeholder hasta recibir el arte final del pez (vendrán 5 variantes).
export const FISH: Visual = { emoji: '🐟' };
export const WATER_COLOR = '#7cc3e8';
