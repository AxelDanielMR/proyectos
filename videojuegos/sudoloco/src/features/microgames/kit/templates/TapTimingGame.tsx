import React, { useContext, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { StageSizeContext } from '../primitives/MicrogameStage';
import { TapZone } from '../primitives/TapZone';
import { isWithinWindow, type TimingWindow } from './tapTiming.logic';
import type { MicrogameResult, Visual } from '../../types';

export interface TapTimingConfig {
  window: TimingWindow;
  travelMs: number;
  ball: Visual;
  batter: Visual;
}

const BALL = 48;

export function TapTimingGame({
  config,
  onResult,
}: {
  config: TapTimingConfig;
  onResult: (r: MicrogameResult) => void;
}) {
  const { width, height } = useContext(StageSizeContext);
  const progress = useSharedValue(0);
  const resolvedRef = useRef(false);

  const finish = (r: MicrogameResult) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    cancelAnimation(progress);
    onResult(r);
  };

  const miss = () => finish('lose');

  useEffect(() => {
    progress.value = withTiming(1, { duration: config.travelMs }, (finished) => {
      'worklet';
      if (finished) runOnJS(miss)();
    });
    return () => cancelAnimation(progress);
  }, []);

  const onTap = () => {
    const t = progress.value;
    finish(isWithinWindow(t, config.window.start, config.window.end) ? 'win' : 'lose');
  };

  const ballStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (width - BALL) }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ball, { top: height * 0.45 }, ballStyle]}>
        <Text style={styles.ballText}>{config.ball.emoji ?? '⚾'}</Text>
      </Animated.View>

      <TapZone
        x={width * 0.58}
        y={height * 0.25}
        width={width * 0.42}
        height={height * 0.5}
        onTap={onTap}
      >
        <Text style={styles.batter}>{config.batter.emoji ?? '🏏'}</Text>
      </TapZone>
    </View>
  );
}

const styles = StyleSheet.create({
  ball: { position: 'absolute', width: BALL, height: BALL, alignItems: 'center', justifyContent: 'center' },
  ballText: { fontSize: 36 },
  batter: { fontSize: 72 },
});
