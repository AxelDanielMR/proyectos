import type { ImageSourcePropType } from 'react-native';

// Iconos de acción/HUD. Los PNG viven junto a este módulo. Cambiar de emoji a
// PNG (o reemplazar un icono) = solo tocar aquí.
export const actionIcons = {
  heart: require('./heart.png'),
  frozenHeart: require('./frozen_heart.png'),
  pencil: require('./pencil.png'),
  eraser: require('./ereaser.png'),
  hint: require('./hind.png'),
  silverCell: require('./silver_cell.png'),
  goldenCell: require('./golden_cell.png'),
} satisfies Record<string, ImageSourcePropType>;
