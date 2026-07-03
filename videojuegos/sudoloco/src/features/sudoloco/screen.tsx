import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text } from '@ui/primitives/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSudolocoStore } from './store';
import { LivesDisplay, TimerDisplay, ScoreDisplay } from './ui/HUD';
import { SudokuGame } from '@ui/SudokuGame';
import { createSudokuGameStore } from '@ui/SudokuGame';
import type { SudokuGameStore } from '@ui/SudokuGame';
import { numbersPack } from '@core/symbols';
import { rollReward } from '@core/sudoku';
import type { Reward } from '@core/sudoku';
import { colors } from '@theme/colors';
import { useAuthStore } from '@features/auth';
import { useQueryClient } from '@tanstack/react-query';
import { updateHighscoreIfBetter, addCoins } from '@services/firebase/users.repo';
import { userKeys } from '@features/auth';
import { loadSave, clearSave } from './save.storage';
import { deserializeRun, type SavedRun, type RestoredRun } from './save';
import { useAutoSave, snapshotSave } from './useAutoSave';
import { MicrogameRunner, listMicrogames, pickMicrogame, levelToDifficulty } from '@features/microjuegos';
import type { Microgame } from '@features/microjuegos';

export function SudolocoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const {
    phase, level, lives, crystalHearts, timeRemaining, score,
    hints, silverCells, goldenCells, coinsEarned, puzzle, rng, seed,
    startRun, restoreRun, onCellCorrect, onCellIncorrect, onBoxComplete,
    onPuzzleComplete, tick, nextLevel, exitMicrogame, grantReward,
    resetRun, pauseRun, resumeRun, settled, markSettled,
  } = useSudolocoStore();

  // undefined = aún no revisado; null = revisado, sin save; SavedRun = hay save.
  const [pendingSave, setPendingSave] = useState<SavedRun | null | undefined>(undefined);
  const [gameStore, setGameStore] = useState<SudokuGameStore | null>(null);
  // bootstrap async terminado: el efecto del puzzle no construye hasta entonces,
  // para no crear un tablero fresco antes de que resuelva loadSave (AsyncStorage).
  const [bootstrapped, setBootstrapped] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const restoreDataRef = useRef<RestoredRun | null>(null);

  useAutoSave(gameStore);

  // Al montar: cargar save (async). En idle, esperar decisión (Continuar/Nueva) o
  // iniciar. Si la ruta se re-monta a media run (el gameStore local se perdió al
  // desmontar), recuperar el tablero desde el save del disco para no perder progreso.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const save = await loadSave();
      if (cancelled) return;
      if (phase === 'idle') {
        setPendingSave(save);
        if (!save) startRun();
      } else if (save && save.seed === seed && save.level === level) {
        restoreDataRef.current = deserializeRun(save);
      }
      setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Construir el game store cuando cambia el puzzle (inicio, nextLevel o restore).
  // Gated en `bootstrapped` para que el re-montaje recupere el tablero del save.
  useEffect(() => {
    if (!bootstrapped || !puzzle || !rng) return;
    const restore = restoreDataRef.current;
    restoreDataRef.current = null;
    const store = createSudokuGameStore({
      puzzle,
      rng,
      initialHints: restore ? restore.hintsRemaining : hints,
      initialSilverCells: restore ? restore.silverRemaining : silverCells,
      initialGoldenCells: restore ? restore.goldenRemaining : goldenCells,
      initialBoard: restore?.board,
      initialNotes: restore?.notesByCell,
      initialErrorIndices: restore?.errorIndices,
      callbacks: {
        onCellCorrect: (idx) => onCellCorrect(idx),
        onCellIncorrect: () => onCellIncorrect(),
        onBoxComplete: (boxIdx) => onBoxComplete(boxIdx),
        onPuzzleComplete: () => onPuzzleComplete(),
      },
    });
    setGameStore(store);
  }, [puzzle, bootstrapped]);

  // Persistir highscore + monedas y limpiar el save al terminar la run. El flag
  // `settled` vive en el run store (singleton), así que sobrevive a un re-montaje
  // de la ruta y evita canjear las monedas dos veces.
  useEffect(() => {
    if (phase !== 'gameover' || settled) return;
    markSettled();
    void clearSave();
    if (!user) return;
    Promise.all([
      updateHighscoreIfBetter(user.uid, score),
      addCoins(user.uid, coinsEarned),
    ])
      .then(() => {
        qc.invalidateQueries({ queryKey: userKeys.profile(user.uid) });
      })
      .catch(console.warn);
  }, [phase]);

  // Sync power-ups otorgados mid-run hacia el game store.
  useEffect(() => {
    if (!gameStore) return;
    const diff = hints - gameStore.getState().hintsRemaining;
    if (diff > 0) gameStore.getState().grantHints(diff);
  }, [hints, gameStore]);

  useEffect(() => {
    if (!gameStore) return;
    const diff = silverCells - gameStore.getState().silverRemaining;
    if (diff > 0) gameStore.getState().grantSilverCells(diff);
  }, [silverCells, gameStore]);

  useEffect(() => {
    if (!gameStore) return;
    const diff = goldenCells - gameStore.getState().goldenRemaining;
    if (diff > 0) gameStore.getState().grantGoldenCells(diff);
  }, [goldenCells, gameStore]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [phase, tick]);

  const [microgameReward, setMicrogameReward] = useState<Reward | null>(null);
  useEffect(() => {
    if (phase === 'microgame' && rng) {
      setMicrogameReward(rollReward(level, rng));
    } else {
      setMicrogameReward(null);
    }
  }, [phase, rng, level]);

  const [activeMicrogame, setActiveMicrogame] = useState<Microgame | null>(null);
  useEffect(() => {
    if (phase === 'microgame' && rng) {
      // discoveredIds: la persistencia de descubiertos llega con el menú (fuera de alcance).
      const picked = pickMicrogame(listMicrogames(), level, new Set(), rng);
      setActiveMicrogame(picked);
      // Sin microjuego elegible: salir para no dejar la run atascada en 'microgame'.
      if (!picked) exitMicrogame();
    } else {
      setActiveMicrogame(null);
    }
  }, [phase, rng, level, exitMicrogame]);

  const handleContinue = () => {
    if (!pendingSave) return;
    const restored = deserializeRun(pendingSave);
    restoreDataRef.current = restored;
    setPendingSave(null);
    restoreRun(restored);
  };

  const handleNewGame = () => {
    void clearSave();
    setPendingSave(null);
    startRun();
  };

  // Guardado manual desde la pausa (además del autosave). Muestra confirmación.
  const handleManualSave = () => {
    if (!gameStore) return;
    snapshotSave(gameStore);
    setSavedFlash(true);
  };

  const handleResume = () => {
    setSavedFlash(false);
    resumeRun();
  };

  // Pantalla de reanudación (hay save y aún no se decidió).
  if (phase === 'idle') {
    if (pendingSave) {
      return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <Text style={styles.title}>Partida en curso</Text>
            <Text style={styles.finalScore}>Nivel {pendingSave.level}</Text>
            <Text style={styles.finalScore}>Score: {pendingSave.score.toLocaleString()}</Text>
            <Pressable style={styles.startBtn} onPress={handleContinue}>
              <Text style={styles.startBtnText}>Continuar</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={handleNewGame}>
              <Text style={styles.secondaryBtnText}>Empezar de nuevo</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return null;
  }

  if (phase === 'gameover') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.gameoverTitle}>Game Over</Text>
          <Text style={styles.finalScore}>Score: {score.toLocaleString()}</Text>
          <Text style={styles.finalScore}>Nivel: {level}</Text>
          <Text style={styles.coins}>+{coinsEarned} monedas</Text>
          <Pressable
            style={styles.startBtn}
            onPress={() => {
              resetRun();
              router.replace('/(tabs)/home');
            }}
          >
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

  if (!gameStore) return null;

  const urgency = Math.max(0, Math.min(1, (30 - timeRemaining) / 30));

  return (
    <View style={styles.safe}>
      <SudokuGame
        store={gameStore}
        pack={numbersPack}
        showHintButton={hints > 0}
        showSilverButton={silverCells > 0}
        showGoldenButton={goldenCells > 0}
        template={{ backgroundId: 'base', urgency, paused: phase !== 'playing' }}
      />

      <View style={[styles.hud, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <LivesDisplay lives={lives} crystalHearts={crystalHearts} />
        <TimerDisplay timeRemaining={timeRemaining} />
        <View style={styles.hudRight}>
          <Pressable onPress={pauseRun} style={styles.pauseBtn}>
            <Text style={styles.pauseIcon}>⏸️</Text>
          </Pressable>
          <ScoreDisplay score={score} level={level} />
        </View>
      </View>

      {phase === 'paused' && (
        <View style={styles.overlay} pointerEvents="auto">
          <Text style={styles.overlayTitle}>⏸️ Pausa</Text>
          <Pressable style={styles.startBtn} onPress={handleResume}>
            <Text style={styles.startBtnText}>Continuar</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={handleManualSave}>
            <Text style={styles.secondaryBtnText}>
              {savedFlash ? '¡Guardado! ✓' : 'Guardar'}
            </Text>
          </Pressable>
          <Text style={styles.autosaveHint}>Tu progreso se guarda automáticamente</Text>
        </View>
      )}

      {phase === 'microgame' && activeMicrogame && rng && (
        <MicrogameRunner
          game={activeMicrogame}
          difficulty={levelToDifficulty(level)}
          rng={rng}
          onFinish={(result) => {
            if (result === 'win' && microgameReward) {
              grantReward(microgameReward);
            }
            exitMicrogame();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.base },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
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
  secondaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brand.primary,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.brand.primary },
  autosaveHint: { fontSize: 12, color: colors.text.secondary, opacity: 0.8, marginTop: 4 },
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
