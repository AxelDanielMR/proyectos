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
    phase, level, lives, crystalHearts, timeRemaining, score,
    hints, silverCells, goldenCells, coinsEarned, puzzle, rng,
    startRun, onCellCorrect, onCellIncorrect, onBoxComplete,
    onPuzzleComplete, tick, nextLevel, exitMicrogame, grantReward,
    resetRun, pauseRun, resumeRun,
  } = useSudolocoStore();

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

  const gameStoreRef = useRef<ReturnType<typeof createSudokuGameStore> | null>(null);

  useEffect(() => {
    if (puzzle && rng) {
      gameStoreRef.current = createSudokuGameStore({
        puzzle,
        rng,
        initialHints: hints,
        initialSilverCells: silverCells,
        initialGoldenCells: goldenCells,
        callbacks: {
          onCellCorrect: (idx) => onCellCorrect(idx),
          onCellIncorrect: () => onCellIncorrect(),
          onBoxComplete: (boxIdx) => onBoxComplete(boxIdx),
          onPuzzleComplete: () => onPuzzleComplete(),
        },
      });
    }
  }, [puzzle]);

  // Sync power-ups into the game store when granted mid-run.
  useEffect(() => {
    const store = gameStoreRef.current;
    if (!store) return;
    const diff = hints - store.getState().hintsRemaining;
    if (diff > 0) store.getState().grantHints(diff);
  }, [hints]);

  useEffect(() => {
    const store = gameStoreRef.current;
    if (!store) return;
    const diff = silverCells - store.getState().silverRemaining;
    if (diff > 0) store.getState().grantSilverCells(diff);
  }, [silverCells]);

  useEffect(() => {
    const store = gameStoreRef.current;
    if (!store) return;
    const diff = goldenCells - store.getState().goldenRemaining;
    if (diff > 0) store.getState().grantGoldenCells(diff);
  }, [goldenCells]);

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

  useEffect(() => {
    if (phase === 'playing' && level === 1) savedRef.current = false;
  }, [phase, level]);

  void router;

  if (phase === 'idle') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>SUDOLOCO</Text>
          <Pressable style={styles.startBtn} onPress={() => startRun()}>
            <Text style={styles.startBtnText}>Jugar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'gameover') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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

  if (phase === 'between_levels') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>¡Nivel {level} completado!</Text>
          <Text style={styles.bonusText}>+60 segundos</Text>
          <Pressable style={styles.startBtn} onPress={() => nextLevel()}>
            <Text style={styles.startBtnText}>Siguiente nivel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!gameStoreRef.current) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.hud}>
        <LivesDisplay lives={lives} crystalHearts={crystalHearts} />
        <TimerDisplay timeRemaining={timeRemaining} />
        <View style={styles.hudRight}>
          <Pressable onPress={pauseRun} style={styles.pauseBtn}>
            <Text style={styles.pauseIcon}>⏸️</Text>
          </Pressable>
          <ScoreDisplay score={score} level={level} />
        </View>
      </View>

      <SudokuGame
        store={gameStoreRef.current}
        pack={numbersPack}
        showHintButton={hints > 0}
        showSilverButton={silverCells > 0}
        showGoldenButton={goldenCells > 0}
      />

      {phase === 'paused' && (
        <View style={styles.overlay} pointerEvents="auto">
          <Text style={styles.overlayTitle}>⏸️ Pausa</Text>
          <Pressable style={styles.startBtn} onPress={resumeRun}>
            <Text style={styles.startBtnText}>Continuar</Text>
          </Pressable>
        </View>
      )}

      {phase === 'microgame' && (
        <View style={styles.overlay} pointerEvents="auto">
          <Text style={styles.overlayTitle}>¡Microjuego!</Text>
          <Text style={styles.bonusText}>+{15}s garantizados</Text>
          {microgameReward && (
            <Text style={styles.rewardText}>{rewardLabel(microgameReward)}</Text>
          )}
          <Pressable
            style={styles.startBtn}
            onPress={() => {
              grantReward({ kind: 'time', amount: 15 });
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
  safe: { flex: 1, backgroundColor: colors.bg.base },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pauseBtn: { padding: 4 },
  pauseIcon: { fontSize: 20 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
    gap: 20,
  },
  title: { fontSize: 32, fontWeight: '900', color: colors.text.primary, letterSpacing: 2 },
  gameoverTitle: { fontSize: 40, fontWeight: '900', color: colors.state.danger },
  finalScore: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  coins: { fontSize: 18, fontWeight: '600', color: colors.brand.accent },
  bonusText: { fontSize: 18, fontWeight: '600', color: colors.state.success },
  startBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
  },
  startBtnText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  overlayTitle: { fontSize: 28, fontWeight: '900', color: colors.text.primary },
  rewardText: { fontSize: 22, fontWeight: '700', color: colors.brand.accent },
});

function rewardLabel(reward: Reward): string {
  switch (reward.kind) {
    case 'time': return `¡+${reward.amount}s extra!`;
    case 'hint': return '🔍 ¡Una pista!';
    case 'silver_cell': return '🥈 ¡Casilla plateada!';
    case 'golden_cell': return '🥇 ¡Casilla dorada!';
    case 'life': return '♥ ¡Vida extra!';
    case 'crystal_heart': return '◇ ¡Corazón de cristal!';
    case 'none': return '';
  }
}
