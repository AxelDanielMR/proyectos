import './register'; // side-effect: registra todos los juegos al importar el feature

export { MicrogameRunner } from './runner';
export { listMicrogames, getMicrogame } from './registry';
export { pickMicrogame, levelToDifficulty } from './selection';
export type { Microgame, MicrogameResult, MicrogameCategory } from './types';
