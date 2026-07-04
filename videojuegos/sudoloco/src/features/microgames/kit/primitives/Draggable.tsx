import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

/**
 * Sprite arrastrable posicionado en (startX, startY) dentro del stage.
 * Al soltar, reporta el centro absoluto (px del stage) vía `onDrop` y vuelve a su origen.
 */
export function Draggable({
  startX,
  startY,
  size,
  onDrop,
  children,
}: {
  startX: number;
  startY: number;
  size: number;
  onDrop: (centerX: number, centerY: number) => void;
  children: React.ReactNode;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const pan = Gesture.Pan()
    .onChange((e) => {
      tx.value += e.changeX;
      ty.value += e.changeY;
    })
    .onEnd(() => {
      const cx = startX + tx.value + size / 2;
      const cy = startY + ty.value + size / 2;
      runOnJS(onDrop)(cx, cy);
      tx.value = withSpring(0);
      ty.value = withSpring(0);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.base,
          { left: startX, top: startY, width: size, height: size },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
