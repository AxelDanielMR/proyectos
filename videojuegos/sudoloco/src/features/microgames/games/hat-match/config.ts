import type { Rng } from '@core/sudoku';
import type { DragMatchConfig } from '../../kit/templates/DragMatchGame';
import { CHARACTERS, type CharacterAsset } from './assets';

/** Baraja una copia con Fisher-Yates usando el rng dado. */
function shuffle<T>(items: T[], rng: Rng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = arr[i];
    const b = arr[j];
    if (a !== undefined && b !== undefined) {
      arr[i] = b;
      arr[j] = a;
    }
  }
  return arr;
}

/**
 * difficulty 0 → 3 personajes, 1 sombrero. difficulty 1 → 4 personajes, 2 sombreros.
 * (Curva propia del juego; se balancea después.)
 */
export function buildConfig(difficulty: number, rng: Rng): DragMatchConfig {
  const d = Math.max(0, Math.min(1, difficulty));
  const characterCount = d >= 0.5 ? 4 : 3;
  const hatCount = d >= 0.75 ? 2 : 1;

  const chosen: CharacterAsset[] = shuffle(CHARACTERS, rng).slice(0, characterCount);
  const withHats: CharacterAsset[] = shuffle(chosen, rng).slice(0, hatCount);

  return {
    targets: chosen.map((c) => ({
      id: c.id,
      visual: c.character,
      winFrames: c.win,
      winWithItemFrames: c.winWithHat,
      loseFrames: c.lose,
    })),
    draggables: withHats.map((c) => ({ id: `hat-${c.id}`, targetId: c.id, visual: c.hat })),
  };
}
