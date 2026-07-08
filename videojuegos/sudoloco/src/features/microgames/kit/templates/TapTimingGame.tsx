import React, { useContext, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { StageSizeContext } from '../primitives/MicrogameStage';
import { VisualView } from '../primitives/VisualView';
import type { MicrogameResult, Visual } from '../../types';

export interface TapTimingConfig {
  travelMs: number;
  ball: Visual;
  batter: Visual;
  /** 0..1 del alto del stage: altura inicial de la bola (aleatoria por partida). */
  startYRatio: number;
  /** Amplitud del zigzag, como fracción del alto del stage. */
  waveAmplitudeRatio: number;
  /** Ciclos completos que recorre la onda a lo largo del trayecto. */
  waveFrequency: number;
  /** Fase inicial de la onda: varía la forma exacta del trayecto entre partidas. */
  wavePhase: number;
}

const BALL = 48;
const BATTER_SIZE = 72;
const BAT_MIN_TX = -80;
const BAT_MAX_TX = 60;
// Sin ventana de precisión: basta llevar el bate hacia la pelota (izquierda) esta
// distancia, en cualquier momento antes de que la bola pase, para conectar el golpe.
const SWING_THRESHOLD_PX = -20;

// Al conectar el golpe, la bola sale volando hacia arriba-izquierda (home run):
// sube, retrocede y se encoge antes de reportar la victoria — así el jugador
// alcanza a verlo.
const FLY_DURATION_MS = 700;
const FLY_DISTANCE_X_RATIO = 0.5;
const FLY_DISTANCE_Y_RATIO = 0.6;
const FLY_SHRINK = 0.85;

export function TapTimingGame({
  config,
  onResult,
  onReveal,
}: {
  config: TapTimingConfig;
  onResult: (r: MicrogameResult) => void;
  onReveal?: () => void;
}) {
  const { width, height } = useContext(StageSizeContext);
  const progress = useSharedValue(0);
  const batTx = useSharedValue(0);
  const flyT = useSharedValue(0);
  const resolvedRef = useRef(false);
  const flyingRef = useRef(false);

  const finish = (r: MicrogameResult) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    cancelAnimation(progress);
    onResult(r);
  };

  const miss = () => finish('lose');

  // Congela el trayecto normal donde esté y arranca el vuelo de home run; el
  // resultado se reporta al terminar esa animación, no al detectarse.
  const swing = () => {
    if (flyingRef.current || resolvedRef.current) return;
    flyingRef.current = true;
    cancelAnimation(progress);
    onReveal?.();
    flyT.value = withTiming(1, { duration: FLY_DURATION_MS, easing: Easing.in(Easing.quad) }, (done) => {
      'worklet';
      if (done) runOnJS(finish)('win');
    });
  };

  useEffect(() => {
    progress.value = withTiming(1, { duration: config.travelMs }, (finished) => {
      'worklet';
      if (finished) runOnJS(miss)();
    });
    return () => cancelAnimation(progress);
  }, []);

  const pan = Gesture.Pan()
    .onChange((e) => {
      batTx.value = Math.max(BAT_MIN_TX, Math.min(BAT_MAX_TX, batTx.value + e.changeX));
      if (batTx.value <= SWING_THRESHOLD_PX) {
        batTx.value = withTiming(BAT_MIN_TX, { duration: 80 });
        runOnJS(swing)();
      }
    })
    .onEnd(() => {
      batTx.value = withSpring(0);
    });

  const ballStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const baseX = p * (width - BALL);
    const wave = Math.sin(p * config.waveFrequency * Math.PI * 2 + config.wavePhase);
    const baseY = config.startYRatio * height + wave * config.waveAmplitudeRatio * height;

    const flyX = flyT.value * width * FLY_DISTANCE_X_RATIO;
    const flyY = flyT.value * height * FLY_DISTANCE_Y_RATIO;
    const scale = 1 - flyT.value * FLY_SHRINK;

    return {
      transform: [
        { translateX: baseX - flyX },
        { translateY: baseY - flyY },
        { scale },
      ],
    };
  });

  const batterStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: batTx.value }, { rotate: `${batTx.value * 0.5}deg` }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ball, ballStyle]}>
        <VisualView visual={config.ball} size={BALL} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <View
          style={[
            styles.swingZone,
            {
              left: width * 0.45,
              top: height * 0.2,
              width: width * 0.55,
              height: height * 0.6,
            },
          ]}
        >
          <Animated.View style={batterStyle}>
            <VisualView visual={config.batter} size={BATTER_SIZE} />
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  ball: { position: 'absolute', width: BALL, height: BALL, alignItems: 'center', justifyContent: 'center' },
  swingZone: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
