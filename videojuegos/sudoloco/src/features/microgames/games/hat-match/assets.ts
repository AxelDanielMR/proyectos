import type { Visual } from '../../types';

export interface CharacterAsset {
  id: string;
  character: Visual; // el personaje sin sombrero
  hat: Visual; // el sombrero que le pertenece
}

/** Pool de 5 profesionistas + su sombrero. */
export const CHARACTERS: CharacterAsset[] = [
  {
    id: 'vaquero',
    character: { source: require('../../../../../assets/microgames/hat-match/cowboy.png'), label: 'Vaquero' },
    hat: { source: require('../../../../../assets/microgames/hat-match/cowboy_hat.png') },
  },
  {
    id: 'chofer',
    character: { source: require('../../../../../assets/microgames/hat-match/driver.png'), label: 'Chofer' },
    hat: { source: require('../../../../../assets/microgames/hat-match/driver_hat.png') },
  },
  {
    id: 'ecologist',
    character: { source: require('../../../../../assets/microgames/hat-match/ecologist.png'), label: 'Ecólogo' },
    hat: { source: require('../../../../../assets/microgames/hat-match/ecologist_hat.png') },
  },
  {
    id: 'bombero',
    character: { source: require('../../../../../assets/microgames/hat-match/firefighter.png'), label: 'Bombero' },
    hat: { source: require('../../../../../assets/microgames/hat-match/firefighter_hat.png') },
  },
  {
    id: 'alcalde',
    character: { source: require('../../../../../assets/microgames/hat-match/mayor.png'), label: 'Alcalde' },
    hat: { source: require('../../../../../assets/microgames/hat-match/mayor_hat.png') },
  },
];
