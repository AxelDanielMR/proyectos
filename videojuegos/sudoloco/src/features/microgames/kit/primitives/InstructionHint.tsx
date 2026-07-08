import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { InstructionStep } from '../../types';

const HAND_IMAGES = {
  pointer: require('../../../../../assets/microgames/instructions/pointer.png'),
  clicking: require('../../../../../assets/microgames/instructions/clicking.png'),
} as const;
const PARTICLES = require('../../../../../assets/microgames/instructions/particules.png');

const LOOP_PAUSE_MS = 400;

/**
 * Bucle de instrucciones arriba a la derecha del stage. Reproduce los pasos en
 * secuencia (imagen de mano + partículas + desplazamiento) y repite con una
 * pausa corta. No captura toques.
 */
export function InstructionHint({ steps }: { steps: InstructionStep[] }) {
  const [stepIndex, setStepIndex] = useState(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    const step = steps[stepIndex];
    if (!step) return;
    if (step.move) {
      tx.value = withTiming(tx.value + step.move.dx, { duration: step.durationMs });
      ty.value = withTiming(ty.value + step.move.dy, { duration: step.durationMs });
    }
    const isLast = stepIndex === steps.length - 1;
    const id = setTimeout(() => {
      if (isLast) {
        tx.value = 0;
        ty.value = 0;
      }
      setStepIndex(isLast ? 0 : stepIndex + 1);
    }, step.durationMs + (isLast ? LOOP_PAUSE_MS : 0));
    return () => clearTimeout(id);
  }, [stepIndex, steps, tx, ty]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  const step = steps[stepIndex];
  if (!step) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.frame, animatedStyle]}>
        {/* Las tres imágenes comparten el mismo lienzo 84×92: se apilan alineadas
            (las partículas ya vienen dibujadas sobre la punta del dedo). */}
        {step.particles && (
          <Image source={PARTICLES} style={styles.layer} resizeMode="contain" />
        )}
        <Image source={HAND_IMAGES[step.hand]} style={styles.layer} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 12,
    width: 96,
    height: 110,
    zIndex: 6,
    opacity: 0.92,
  },
  frame: { width: 42, height: 46 },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 42,
    height: 46,
  },
});
