import { useState, useEffect } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export interface ProgressBarProps {
  progress: number; // 0–100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const pixelWidth = useSharedValue(0);

  useEffect(() => {
    pixelWidth.value = withTiming((progress / 100) * containerWidth, { duration: 400 });
  }, [progress, containerWidth, pixelWidth]);

  const animatedStyle = useAnimatedStyle(() => ({ width: pixelWidth.value }));

  return (
    <View
      className="h-2 w-full overflow-hidden rounded-full bg-slate-700"
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View className="h-full rounded-full bg-indigo-500" style={animatedStyle} />
    </View>
  );
}
