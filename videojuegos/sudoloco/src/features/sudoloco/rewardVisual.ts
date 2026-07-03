import type { Reward } from '@core/sudoku';

// Claves de icono que RewardReveal resuelve contra @ui/icons (actionIcons).
// Se mantienen como string literal (no `keyof typeof actionIcons`) para que este
// módulo sea puro y testeable en node sin importar los PNG.
export type RewardIcon = 'hint' | 'silverCell' | 'goldenCell' | 'heart' | 'frozenHeart';

export type RewardVisual = { emoji: string } | { icon: RewardIcon };

// time_boost es placeholder emoji hasta tener su imagen (tarea futura del usuario).
export function rewardVisual(reward: Reward): RewardVisual {
  switch (reward.kind) {
    case 'time_boost':
      return { emoji: '⏱️' };
    case 'hint':
      return { icon: 'hint' };
    case 'silver_cell':
      return { icon: 'silverCell' };
    case 'golden_cell':
      return { icon: 'goldenCell' };
    case 'life':
      return { icon: 'heart' };
    case 'crystal_heart':
      return { icon: 'frozenHeart' };
  }
}
