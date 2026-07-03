import { registerMicrogame } from './registry';
import { ponElSombrero } from './games/pon-el-sombrero';
import { homeRun } from './games/home-run';

// Agregar un microjuego = importar arriba + una línea aquí.
registerMicrogame(ponElSombrero);
registerMicrogame(homeRun);
