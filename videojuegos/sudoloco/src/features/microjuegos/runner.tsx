import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { MicrogameStage } from './kit/primitives/MicrogameStage';
import { useMicrogameTimer } from './kit/primitives/useMicrogameTimer';
import { VerdictReaction } from './kit/primitives/VerdictReaction';
import type { Microgame, MicrogameResult } from './types';
import type { Rng } from '@core/sudoku';

export function MicrogameRunner({
  game,
  difficulty,
  rng,
  onFinish,
}: {
  game: Microgame;
  difficulty: number;
  rng: Rng;
  onFinish: (result: MicrogameResult) => void;
}) {
  const [result, setResult] = useState<MicrogameResult | null>(null);

  const handleResult = (r: MicrogameResult) => {
    setResult((prev) => prev ?? r); // primer resultado gana
  };

  // El timer corre mientras no haya resultado; al agotarse es derrota.
  const progress = useMicrogameTimer(game.durationMs, () => handleResult('lose'), result === null);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const Game = game.Component;

  return (
    <MicrogameStage>
      <View style={styles.timerTrack} pointerEvents="none">
        <Animated.View style={[styles.timerFill, barStyle]} />
      </View>

      <Game difficulty={difficulty} rng={rng} onResult={handleResult} />

      {result !== null && (
        <VerdictReaction result={result} onDone={() => onFinish(result)} />
      )}
    </MicrogameStage>
  );
}

const styles = StyleSheet.create({
  timerTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.12)',
    zIndex: 5,
  },
  timerFill: { height: 8, backgroundColor: '#ef4444' },
});
