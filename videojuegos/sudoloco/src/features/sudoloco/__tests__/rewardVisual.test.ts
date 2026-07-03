import { rewardVisual } from '../rewardVisual';
import type { Reward } from '@core/sudoku';

describe('rewardVisual', () => {
  it('time_boost usa emoji (placeholder temporal)', () => {
    const v = rewardVisual({ kind: 'time_boost' });
    expect(v).toEqual({ emoji: '⏱️' });
  });

  it.each([
    ['hint', 'hint'],
    ['silver_cell', 'silverCell'],
    ['golden_cell', 'goldenCell'],
    ['life', 'heart'],
    ['crystal_heart', 'frozenHeart'],
  ] as const)('%s usa el icono %s', (kind, icon) => {
    const v = rewardVisual({ kind } as Reward);
    expect(v).toEqual({ icon });
  });

  it('todo Reward produce un visual con emoji o icon', () => {
    const kinds: Reward['kind'][] = [
      'time_boost',
      'hint',
      'silver_cell',
      'golden_cell',
      'life',
      'crystal_heart',
    ];
    for (const kind of kinds) {
      const v = rewardVisual({ kind } as Reward);
      const hasEmoji = 'emoji' in v && v.emoji.length > 0;
      const hasIcon = 'icon' in v && v.icon.length > 0;
      expect(hasEmoji || hasIcon).toBe(true);
    }
  });
});
