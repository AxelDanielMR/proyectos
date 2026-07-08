import type { Visual } from '../../types';

export type AnimFrames = [Visual, Visual];

export interface CharacterAsset {
  id: string;
  character: Visual; // el personaje sin sombrero (reposo, drag-match)
  hat: Visual; // el sombrero que le pertenece
  win: AnimFrames; // victoria SIN sombrero (personaje no elegido para llevarlo)
  winWithHat: AnimFrames; // victoria CON el sombrero puesto
  lose: AnimFrames; // derrota (nunca lleva sombrero)
}

/** Pool de 5 profesionistas + su sombrero + animaciones de victoria/derrota. */
export const CHARACTERS: CharacterAsset[] = [
  {
    id: 'vaquero',
    character: { source: require('../../../../../assets/microgames/hat-match/cowboy.png'), label: 'Vaquero' },
    hat: { source: require('../../../../../assets/microgames/hat-match/cowboy_hat.png') },
    win: [
      { source: require('../../../../../assets/microgames/hat-match/cowboy_win1.png') },
      { source: require('../../../../../assets/microgames/hat-match/cowboy_win2.png') },
    ],
    winWithHat: [
      { source: require('../../../../../assets/microgames/hat-match/cowboy_win_wh1.png') },
      { source: require('../../../../../assets/microgames/hat-match/cowboy_win_wh2.png') },
    ],
    lose: [
      { source: require('../../../../../assets/microgames/hat-match/cowboy_lose1.png') },
      { source: require('../../../../../assets/microgames/hat-match/cowboy_lose2.png') },
    ],
  },
  {
    id: 'chofer',
    character: { source: require('../../../../../assets/microgames/hat-match/driver.png'), label: 'Chofer' },
    hat: { source: require('../../../../../assets/microgames/hat-match/driver_hat.png') },
    win: [
      { source: require('../../../../../assets/microgames/hat-match/driver_win1.png') },
      { source: require('../../../../../assets/microgames/hat-match/driver_win2.png') },
    ],
    winWithHat: [
      { source: require('../../../../../assets/microgames/hat-match/driver_win_wh1.png') },
      { source: require('../../../../../assets/microgames/hat-match/driver_win_wh2.png') },
    ],
    lose: [
      { source: require('../../../../../assets/microgames/hat-match/driver_lose1.png') },
      { source: require('../../../../../assets/microgames/hat-match/driver_lose2.png') },
    ],
  },
  {
    id: 'ecologist',
    character: { source: require('../../../../../assets/microgames/hat-match/ecologist.png'), label: 'Ecólogo' },
    hat: { source: require('../../../../../assets/microgames/hat-match/ecologist_hat.png') },
    win: [
      { source: require('../../../../../assets/microgames/hat-match/ecologist_win1.png') },
      { source: require('../../../../../assets/microgames/hat-match/ecologist_win2.png') },
    ],
    winWithHat: [
      { source: require('../../../../../assets/microgames/hat-match/ecologist_win_wh1.png') },
      { source: require('../../../../../assets/microgames/hat-match/ecologist_win_wh2.png') },
    ],
    // Nombrados "lost" (no "lose") en el arte original.
    lose: [
      { source: require('../../../../../assets/microgames/hat-match/ecologist_lost1.png') },
      { source: require('../../../../../assets/microgames/hat-match/ecologist_lost2.png') },
    ],
  },
  {
    id: 'bombero',
    character: { source: require('../../../../../assets/microgames/hat-match/firefighter.png'), label: 'Bombero' },
    hat: { source: require('../../../../../assets/microgames/hat-match/firefighter_hat.png') },
    // Las animaciones vienen con el nombre de archivo mal tipeado ("firefigther").
    win: [
      { source: require('../../../../../assets/microgames/hat-match/firefigther_win1.png') },
      { source: require('../../../../../assets/microgames/hat-match/firefigther_win2.png') },
    ],
    winWithHat: [
      { source: require('../../../../../assets/microgames/hat-match/firefigther_win_wh1.png') },
      { source: require('../../../../../assets/microgames/hat-match/firefigther_win_wh2.png') },
    ],
    lose: [
      { source: require('../../../../../assets/microgames/hat-match/firefigther_lose1.png') },
      { source: require('../../../../../assets/microgames/hat-match/firefigther_lose2.png') },
    ],
  },
  {
    id: 'alcalde',
    character: { source: require('../../../../../assets/microgames/hat-match/mayor.png'), label: 'Alcalde' },
    hat: { source: require('../../../../../assets/microgames/hat-match/mayor_hat.png') },
    win: [
      { source: require('../../../../../assets/microgames/hat-match/mayor_win1.png') },
      { source: require('../../../../../assets/microgames/hat-match/mayor_win2.png') },
    ],
    winWithHat: [
      { source: require('../../../../../assets/microgames/hat-match/mayor_win_wh1.png') },
      { source: require('../../../../../assets/microgames/hat-match/mayor_win_wh2.png') },
    ],
    // Nombrados "win_lose" (no "lose") en el arte original.
    lose: [
      { source: require('../../../../../assets/microgames/hat-match/mayor_win_lose1.png') },
      { source: require('../../../../../assets/microgames/hat-match/mayor_win_lose2.png') },
    ],
  },
];
