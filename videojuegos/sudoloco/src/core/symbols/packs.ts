import type { SymbolPack } from './types';

export const numbersPack: SymbolPack = {
  id: 'numbers',
  name: 'Números',
  kind: 'image',
  items: [
    { kind: 'image', source: require('../../../assets/symbols/numbers/1.png') },
    { kind: 'image', source: require('../../../assets/symbols/numbers/2.png') },
    { kind: 'image', source: require('../../../assets/symbols/numbers/3.png') },
    { kind: 'image', source: require('../../../assets/symbols/numbers/4.png') },
    { kind: 'image', source: require('../../../assets/symbols/numbers/5.png') },
    { kind: 'image', source: require('../../../assets/symbols/numbers/6.png') },
    { kind: 'image', source: require('../../../assets/symbols/numbers/7.png') },
    { kind: 'image', source: require('../../../assets/symbols/numbers/8.png') },
    { kind: 'image', source: require('../../../assets/symbols/numbers/9.png') },
  ],
};

export const colorsPack: SymbolPack = {
  id: 'colors',
  name: 'Colores',
  kind: 'color',
  items: [
    { kind: 'color', hex: '#ef4444' },
    { kind: 'color', hex: '#f97316' },
    { kind: 'color', hex: '#eab308' },
    { kind: 'color', hex: '#22c55e' },
    { kind: 'color', hex: '#06b6d4' },
    { kind: 'color', hex: '#3b82f6' },
    { kind: 'color', hex: '#8b5cf6' },
    { kind: 'color', hex: '#ec4899' },
    { kind: 'color', hex: '#64748b' },
  ],
};


export const SYMBOL_PACKS: readonly SymbolPack[] = [numbersPack, colorsPack];

export function getPackById(id: SymbolPack['id']): SymbolPack {
  const pack = SYMBOL_PACKS.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown symbol pack: ${id}`);
  return pack;
}
