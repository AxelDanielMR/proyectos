import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type { MicrogameResult } from '../../types';

export function VerdictReaction({
  result,
  onDone,
}: {
  result: MicrogameResult;
  onDone: () => void;
}) {
  const scale = useSharedValue(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const fire = () => doneRef.current();

  useEffect(() => {
    // Pop rápido con leve rebote + retención corta. Evita el resorte poco
    // amortiguado anterior, que tardaba ~2s en asentarse antes de cerrar.
    scale.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withDelay(
        400,
        withTiming(1, { duration: 1 }, (finished) => {
          'worklet';
          if (finished) runOnJS(fire)();
        }),
      ),
    );
    // `scale` is a Reanimated SharedValue: stable identity across renders.
  }, [scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const face = result === 'win' ? '😄🎉😄' : '😠😞😠';

  return (
    <Animated.View style={[styles.overlay, style]} pointerEvents="none">
      <Text style={styles.face}>{face}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: { fontSize: 56 },
});
