import { registerMicrogame } from './registry';
import { hatMatch } from './games/hat-match';
import { homeRun } from './games/home-run';
import { fishing } from './games/fishing';

// Agregar un microjuego = importar arriba + una línea aquí.
registerMicrogame(hatMatch);
registerMicrogame(homeRun);
registerMicrogame(fishing);
