// Familia pixel-art cargada en runtime con useFonts (app/_layout.tsx).
// El texto de la app usa el envoltorio de @ui/primitives/Text, que aplica esta
// familia por defecto. (En RN 0.81 New Architecture no hay forma fiable de
// parchear Text globalmente: es un componente-función y el módulo usa getters.)
export const FONT_FAMILY = 'PixelifySans';
