export type SymbolPackId = 'numbers' | 'colors' | 'pixel' | 'shapes' | 'mugiwaras' | 'jojos';

export interface SymbolPack {
  readonly id: SymbolPackId;
  readonly name: string;
  readonly kind: 'text' | 'color' | 'image';
  readonly items: readonly SymbolItem[];
  /**
   * Los glifos son monocromos y se pueden recolorear con `tintColor` para
   * contrastar con la superficie (teclado oscuro → blancos, tablero claro →
   * oscuros). Los packs a color (p. ej. sprites) deben dejarlo en `false`.
   */
  readonly tintable?: boolean;
}

export type SymbolItem =
  | { kind: 'text'; value: string }
  | { kind: 'color'; hex: string }
  | { kind: 'image'; source: number };
