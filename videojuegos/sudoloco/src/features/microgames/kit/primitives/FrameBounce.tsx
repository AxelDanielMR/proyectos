import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { VisualView } from './VisualView';
import type { Visual } from '../../types';

/**
 * Personaje que se desplaza hacia abajo mientras alterna dos frames, desde que
 * se monta hasta que el padre lo desmonta (fin de la revelación de victoria/derrota).
 */
export function FrameBounce({
  frames,
  size,
  travelPx,
  travelMs,
  frameIntervalMs,
}: {
  frames: [Visual, Visual];
  size: number;
  travelPx: number;
  travelMs: number;
  frameIntervalMs: number;
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    ty.value = withTiming(travelPx, { duration: travelMs, easing: Easing.inOut(Easing.sin) });
  }, [travelPx, travelMs, ty]);

  useEffect(() => {
    const id = setInterval(() => setFrameIndex((i) => (i === 0 ? 1 : 0)), frameIntervalMs);
    return () => clearInterval(id);
  }, [frameIntervalMs]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  // Los dos frames se montan juntos y solo se alterna la opacidad: cambiar el
  // `source` de un único <Image> parpadea en blanco en Android mientras decodifica
  // el nuevo bitmap, incluso si ya está cacheado.
  return (
    <Animated.View style={[style, { width: size, height: size }]}>
      <VisualView visual={frames[0]} size={size} style={[styles.frame, { opacity: frameIndex === 0 ? 1 : 0 }]} />
      <VisualView visual={frames[1]} size={size} style={[styles.frame, { opacity: frameIndex === 1 ? 1 : 0 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', top: 0, left: 0 },
});
