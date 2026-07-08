import React, { useMemo } from 'react';
import { Image, Text, type StyleProp, type ViewStyle, type ImageStyle, type TextStyle } from 'react-native';
import type { Visual } from '../../types';

// El caller solo pasa layout compartido (position/top/left/opacity), válido en
// ImageStyle y TextStyle por igual — el cast evita repetir la unión en cada uso.
export function VisualView({
  visual,
  size,
  style,
}: {
  visual: Visual;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  // `size` fija el ANCHO; el alto sale de la proporción real de cada imagen
  // (resolveAssetSource es síncrono para assets locales, sin esperar decode).
  // Ancho fijo en vez de un cuadro fijo: los personajes de hat-match comparten
  // ancho de lienzo entre pose idle y reveal, pero el reveal es más alto (deja
  // espacio para el rebote) — forzar un cuadro cuadrado encogía el personaje
  // porque "contain" quedaba limitado por esa altura extra.
  const source = visual.source;
  const height = useMemo(() => {
    if (source === undefined) return size;
    const resolved = Image.resolveAssetSource(source);
    if (!resolved || resolved.width <= 0) return size;
    return size * (resolved.height / resolved.width);
  }, [source, size]);

  if (source !== undefined) {
    return (
      <Image
        source={source}
        style={[{ width: size, height }, style as StyleProp<ImageStyle>]}
        resizeMode="contain"
        onError={(e) => console.warn('Image load error:', e.nativeEvent.error)}
      />
    );
  }
  return (
    <Text style={[{ fontSize: size * 0.7 }, style as StyleProp<TextStyle>]}>
      {visual.emoji ?? '❓'}
    </Text>
  );
}
