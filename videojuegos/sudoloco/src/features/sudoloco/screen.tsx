import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSudolocoStore } from './store';
import { LivesDisplay, TimerDisplay, ScoreDisplay } from './ui/HUD';
import { SudokuGame } from '@ui/SudokuGame';
import { createSudokuGameStore } from '@ui/SudokuGame';
import { numbersPack } from '@core/symbols';
import { rollReward } from '@core/sudoku';
import type { Reward } from '@core/sudoku';
import { colors } from '@theme/colors';
import { useAuthStore } from '@features/auth';
import { useQueryClient } from '@tanstack/react-query';
import { updateHighscoreIfBetter, addCoins } from '@services/firebase/users.repo';
import { userKeys } from '@features/auth';

export function SudolocoScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const {
    phase,
    level,
    lives,
    timeRemaining,
    score,
    hints,
    goldenCells,
    coinsEarned,
    puzzle,
    rng,
    startRun,
    onCellCorrect,
    onCellIncorrect,
    onBoxComplete,
    onPuzzleComplete,
    tick,
    nextLevel,
    exitMicrogame,
    grantReward,
    resetRun,
  } = useSudolocoStore();

  // Write highscore + coins to Firestore when the run ends.
  const savedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'gameover' || savedRef.current || !user) return;
    savedRef.current = true;
    Promise.all([
      updateHighscoreIfBetter(user.uid, score),
      addCoins(user.uid, coinsEarned),
    ]).then(() => {
      qc.invalidateQueries({ queryKey: userKeys.profile(user.uid) });
    }).catch(console.warn);
  }, [phase]);

  // Game store instance — recreated each time the puzzle changes.
  const gameStoreRef = useRef<ReturnType<typeof createSudokuGameStore> | null>(null);

  useEffect(() => {
    if (puzzle && rng) {
      gameStoreRef.current = createSudokuGameStore({
        puzzle,
        rng,
        initialHints: hints,
        initialGoldenCells: goldenCells,
        callbacks: {
          onCellCorrect: (idx) => onCellCorrect(idx),
          onCellIncorrect: () => onCellIncorrect(),
          onBoxComplete: (boxIdx) => onBoxComplete(boxIdx),
          onPuzzleComplete: () => onPuzzleComplete(),
        },
      });
    }
    // puzzle identity changes when a new level starts
  }, [puzzle]);

  // Sync hints/goldenCells granted from microgame rewards into the game store.
  useEffect(() => {
    if (!gameStoreRef.current) return;
    const store = gameStoreRef.current;
    const current = store.getState();
    const diff = hints - current.hintsRemaining;
    if (diff > 0) store.getState().grantHints(diff);
  }, [hints]);

  useEffect(() => {
    if (!gameStoreRef.current) return;
    const store = gameStoreRef.current;
    const current = store.getState();
    const diff = goldenCells - current.goldenRemaining;
    if (diff > 0) store.getState().grantGoldenCells(diff);
  }, [goldenCells]);

  // Timer tick.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [phase, tick]);

  const [microgameReward, setMicrogameReward] = useState<Reward | null>(null);

  useEffect(() => {
    if (phase !== 'microgame' || !rng) return;
    setMicrogameReward(rollReward(level, rng));
  }, [phase]);

  // Reset save flag when a new run starts.
  useEffect(() => {
    if (phase === 'playing' && level === 1) {
      savedRef.current = false;
    }
  }, [phase, level]);

  // --- Idle / not started ---
  if (phase === 'idle') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>SUDOLOCO</Text>
          <Pressable style={styles.startBtn} onPress={() => startRun()}>
            <Text style={styles.startBtnText}>Jugar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Game Over ---
  if (phase === 'gameover') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.gameoverTitle}>Game Over</Text>
          <Text style={styles.finalScore}>Score: {score.toLocaleString()}</Text>
          <Text style={styles.finalScore}>Nivel: {level}</Text>
          <Text style={styles.coins}>+{coinsEarned} monedas</Text>
          <Pressable style={styles.startBtn} onPress={() => resetRun()}>
            <Text style={styles.startBtnText}>Volver al menú</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Between levels ---
  if (phase === 'between_levels') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>¡Nivel {level} completado!</Text>
          <Pressable style={styles.startBtn} onPress={() => nextLevel()}>
            <Text style={styles.startBtnText}>Siguiente nivel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --- No game store yet (should not happen after startRun) ---
  if (!gameStoreRef.current) return null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* HUD */}
      <View style={styles.hud}>
        <LivesDisplay lives={lives} />
        <TimerDisplay timeRemaining={timeRemaining} />
        <ScoreDisplay score={score} level={level} />
      </View>

      {/* Board + NumberPad */}
      <SudokuGame
        store={gameStoreRef.current}
        pack={numbersPack}
        showHintButton={hints > 0}
        showGoldenButton={goldenCells > 0}
      />

      {/* Microgame overlay placeholder */}
      {phase === 'microgame' && (
        <View style={styles.microgameOverlay} pointerEvents="auto">
          <Text style={styles.microgameText}>¡Microjuego!</Text>
          {microgameReward && microgameReward.kind !== 'none' && (
            <Text style={styles.rewardText}>{rewardLabel(microgameReward)}</Text>
          )}
          <Pressable
            style={styles.startBtn}
            onPress={() => {
              if (microgameReward) grantReward(microgameReward);
              exitMicrogame();
            }}
          >
            <Text style={styles.startBtnText}>Continuar</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
    gap: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: 2,
  },
  gameoverTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.state.danger,
  },
  finalScore: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  coins: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.brand.accent,
  },
  startBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  microgameOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  microgameText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text.primary,
  },
  rewardText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.brand.accent,
  },
});

function rewardLabel(reward: Reward): string {
  switch (reward.kind) {
    case 'score': return `¡+${reward.amount} puntos!`;
    case 'hint': return '¡Una pista!';
    case 'golden_cell': return '¡Casilla dorada!';
    case 'life': return '¡Una vida extra!';
    case 'none': return '';
  }
}
