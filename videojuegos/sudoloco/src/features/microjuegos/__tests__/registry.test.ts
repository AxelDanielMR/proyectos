import type { Microgame } from '../types';
import { registerMicrogame, getMicrogame, listMicrogames, _clearRegistry } from '../registry';

const fakeGame = (id: string): Microgame => ({
  id,
  nameKey: `microgames.${id}`,
  category: 'tap-timing',
  minLevel: 1,
  durationMs: 3000,
  Component: () => null,
});

describe('registry', () => {
  beforeEach(() => _clearRegistry());

  it('registers and retrieves a game by id', () => {
    const g = fakeGame('a');
    registerMicrogame(g);
    expect(getMicrogame('a')).toBe(g);
  });

  it('lists all registered games', () => {
    registerMicrogame(fakeGame('a'));
    registerMicrogame(fakeGame('b'));
    expect(listMicrogames().map((g) => g.id).sort()).toEqual(['a', 'b']);
  });

  it('throws on duplicate id', () => {
    registerMicrogame(fakeGame('a'));
    expect(() => registerMicrogame(fakeGame('a'))).toThrow(/already registered/);
  });
});
