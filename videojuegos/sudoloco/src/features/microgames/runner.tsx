import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { InstructionHint } from './kit/primitives/InstructionHint';
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
  const [revealing, setRevealing] = useState(false);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // En victoria el remate lo hace el overlay de la pantalla (RewardReveal): salimos
  // de inmediato, sin mostrar la cara feliz. Igual para juegos con `hasOwnReveal`
  // (ya mostraron su propia animación de victoria/derrota antes de llamar onResult).
  // El resto conserva el VerdictReaction genérico en derrota.
  useEffect(() => {
    if (result === 'win' || (result === 'lose' && game.hasOwnReveal)) {
      onFinishRef.current(result);
    }
  }, [result, game.hasOwnReveal]);

  const handleResult = (r: MicrogameResult) => {
    setResult((prev) => prev ?? r); // primer resultado gana
  };

  // El timer corre mientras no haya resultado y el juego no esté revelando uno ya
  // decidido (onReveal) — si no, un timeout tardío podría pisar un 'win' en curso.
  const progress = useMicrogameTimer(
    game.durationMs,
    () => handleResult('lose'),
    result === null && !revealing,
  );

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const Game = game.Component;

  return (
    <MicrogameStage aspectRatio={game.stageAspectRatio}>
      <View style={styles.timerTrack} pointerEvents="none">
        <Animated.View style={[styles.timerFill, barStyle]} />
      </View>

      <Game
        difficulty={difficulty}
        rng={rng}
        onResult={handleResult}
        onReveal={() => setRevealing(true)}
      />

      {game.instructions && result === null && !revealing && (
        <InstructionHint steps={game.instructions} />
      )}

      {result === 'lose' && !game.hasOwnReveal && (
        <VerdictReaction result="lose" onDone={() => onFinish('lose')} />
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
