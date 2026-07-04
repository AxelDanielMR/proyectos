import { resolveDrop, isMatchCorrect, type DropTargetHit } from '../kit/templates/dragMatch.logic';

const targets: DropTargetHit[] = [
  { id: 'ing', cx: 50, cy: 300, radius: 40 },
  { id: 'fire', cx: 150, cy: 300, radius: 40 },
];

describe('resolveDrop', () => {
  it('returns the target id when dropped within its radius', () => {
    expect(resolveDrop(targets, 55, 305)).toBe('ing');
  });
  it('returns null when dropped outside every target', () => {
    expect(resolveDrop(targets, 300, 300)).toBeNull();
  });
  it('returns the target whose circle contains the point', () => {
    expect(resolveDrop(targets, 148, 300)).toBe('fire');
  });
});

describe('isMatchCorrect', () => {
  it('is true only when dropped target equals expected', () => {
    expect(isMatchCorrect('ing', 'ing')).toBe(true);
    expect(isMatchCorrect('fire', 'ing')).toBe(false);
    expect(isMatchCorrect(null, 'ing')).toBe(false);
  });
});
