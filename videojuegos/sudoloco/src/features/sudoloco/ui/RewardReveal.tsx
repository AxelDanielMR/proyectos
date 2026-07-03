import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Image, View, type ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type { Reward } from '@core/sudoku';
import { actionIcons } from '@ui/icons';
import { rewardVisual, type RewardIcon } from '../rewardVisual';

const BELOW = 260; // desplazamiento inicial por debajo del centro (px)
const RISE_MS = 450;
const HOP_MS = 350; // subida + bajada del brinquito (dividido en dos mitades)
const FALL_MS = 220;
const OBJECT = 96;

const ICON_SOURCE: Record<RewardIcon, ImageSourcePropType> = {
  hint: actionIcons.hint,
  silverCell: actionIcons.silverCell,
  goldenCell: actionIcons.goldenCell,
  heart: actionIcons.heart,
  frozenHeart: actionIcons.frozenHeart,
};

export function RewardReveal({ reward, onDone }: { reward: Reward; onDone: () => void }) {
  const translateY = useSharedValue(BELOW);
  const opacity = useSharedValue(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const fire = () => doneRef.current();

  useEffect(() => {
    // Opacidad: aparece durante la subida, se mantiene en el brinquito, se desvanece en la caída.
    opacity.value = withSequence(
      withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.cubic) }),
      withDelay(HOP_MS, withTiming(0, { duration: FALL_MS, easing: Easing.in(Easing.cubic) })),
    );
    // translateY: A subir al centro · B brinquito (arriba/abajo) · C caer rápido -> onDone.
    translateY.value = withSequence(
      withTiming(0, { duration: RISE_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(-24, { duration: HOP_MS / 2, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: HOP_MS / 2, easing: Easing.in(Easing.quad) }),
      withTiming(BELOW, { duration: FALL_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        'worklet';
        if (finished) runOnJS(fire)();
      }),
    );
  }, []);

  const objectStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value * 0.35 }));

  const visual = rewardVisual(reward);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Animated.View style={[styles.object, objectStyle]}>
        {'icon' in visual ? (
          <Image source={ICON_SOURCE[visual.icon]} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.emoji}>{visual.emoji}</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  object: { width: OBJECT, height: OBJECT, alignItems: 'center', justifyContent: 'center' },
  image: { width: OBJECT, height: OBJECT },
  emoji: { fontSize: OBJECT * 0.8 },
});
