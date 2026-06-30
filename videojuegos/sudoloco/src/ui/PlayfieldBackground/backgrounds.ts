import type { ImageSourcePropType } from 'react-native';

/**
 * Manifiesto de fondos animados. Metro exige que cada `require` de imagen sea
 * estático, por eso los frames se listan explícitamente aquí. Para añadir un
 * fondo: crea `assets/backgrounds/<id>/` con sus frames y registra el array.
 */
export type BackgroundId = 'base';

export const backgrounds: Record<BackgroundId, ImageSourcePropType[]> = {
  base: [
    require('../../../assets/backgrounds/base/bg_base1.png'),
    require('../../../assets/backgrounds/base/bg_base2.png'),
    require('../../../assets/backgrounds/base/bg_base3.png'),
    require('../../../assets/backgrounds/base/bg_base4.png'),
    require('../../../assets/backgrounds/base/bg_base5.png'),
    require('../../../assets/backgrounds/base/bg_base6.png'),
    require('../../../assets/backgrounds/base/bg_base7.png'),
    require('../../../assets/backgrounds/base/bg_base8.png'),
    require('../../../assets/backgrounds/base/bg_base9.png'),
  ],
};
