import { colorsPack } from '../packs';

describe('colorsPack', () => {
  it('has 9 color items, one per digit 1-9', () => {
    expect(colorsPack.items).toHaveLength(9);
    expect(colorsPack.items.every((item) => item.kind === 'color')).toBe(true);
  });

  it('every item is a valid 6-digit hex color', () => {
    for (const item of colorsPack.items) {
      expect(item.kind === 'color' && item.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('is not tintable (already colored, unlike the monochrome image packs)', () => {
    expect(colorsPack.tintable).toBeFalsy();
  });
});
