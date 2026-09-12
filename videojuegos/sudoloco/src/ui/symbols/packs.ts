import type { SymbolPack } from '@core/symbols';
import { colorsPack } from '@core/symbols';

// Vive en ui/, no en core/: usa require() de imágenes (API de Metro), lo que
// rompería la regla de oro "core/ no depende de RN" y — en la práctica — hacía
// que Jest no pudiera cubrir este módulo desde el proyecto `core` (sin asset
// mocking ahí), dejando symbols/ al 0% de cobertura.
export const numbersPack: SymbolPack = {
  id: 'numbers',
  name: 'Números',
  kind: 'image',
  tintable: true,
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

export const SYMBOL_PACKS: readonly SymbolPack[] = [numbersPack, colorsPack];

export function getPackById(id: SymbolPack['id']): SymbolPack {
  const pack = SYMBOL_PACKS.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown symbol pack: ${id}`);
  return pack;
}
