export type SymbolPackId = 'numbers' | 'colors' | 'pixel' | 'shapes' | 'mugiwaras' | 'jojos';

export interface SymbolPack {
  readonly id: SymbolPackId;
  readonly name: string;
  readonly kind: 'text' | 'color' | 'image';
  readonly items: readonly SymbolItem[];
}

export type SymbolItem =
  | { kind: 'text'; value: string }
  | { kind: 'color'; hex: string }
  | { kind: 'image'; source: number };
