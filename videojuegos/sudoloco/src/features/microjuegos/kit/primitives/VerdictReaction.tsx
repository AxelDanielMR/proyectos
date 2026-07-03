import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
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
    scale.value = withSequence(
      withSpring(1, { damping: 8 }),
      withDelay(
        700,
        withTiming(1, { duration: 1 }, (finished) => {
          'worklet';
          if (finished) runOnJS(fire)();
        }),
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
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
