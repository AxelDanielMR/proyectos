import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@ui/primitives/Text';
import { useTranslation } from 'react-i18next';
import { createRng } from '@core/sudoku';
import type { Rng } from '@core/sudoku';
import { colors } from '@theme/colors';
import { listMicrogames } from '../registry';
import { MicrogameRunner } from '../runner';
import type { Microgame, MicrogameResult } from '../types';

const DIFFICULTIES = [
  { key: 'easy', value: 0.15 },
  { key: 'medium', value: 0.5 },
  { key: 'hard', value: 0.9 },
] as const;

interface Session {
  game: Microgame;
  difficulty: number;
  rng: Rng;
  nonce: number;
}

/** Sandbox de microjuegos: lista + dificultad + runner real, sin recompensas. */
export function MicrogameGallery() {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<number>(0.5);
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<MicrogameResult | null>(null);

  const play = (game: Microgame, diff: number, nonce: number) => {
    setResult(null);
    setSession({
      game,
      difficulty: diff,
      rng: createRng(`gallery-${game.id}-${nonce}-${String(Date.now())}`),
      nonce,
    });
  };

  return (
    <View style={styles.container}>
      {/* El padding vive aquí y no en el contenedor: los overlays absolutos
          (runner/resultado) deben cubrir el área completa, sin anillo sin atenuar. */}
      <View style={styles.listArea}>
      <View style={styles.diffRow}>
        {DIFFICULTIES.map((d) => (
          <Pressable
            key={d.key}
            onPress={() => setDifficulty(d.value)}
            style={[styles.chip, difficulty === d.value && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, difficulty === d.value && styles.chipTextActive]}
            >
              {t(`biblioteca.difficulty.${d.key}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {listMicrogames().map((game) => (
        <Pressable
          key={game.id}
          style={styles.row}
          onPress={() => play(game, difficulty, 0)}
        >
          <View>
            <Text style={styles.rowTitle}>{t(game.nameKey)}</Text>
            <Text style={styles.rowSubtitle}>
              {t(`biblioteca.category.${game.category}`, { defaultValue: game.category })}
            </Text>
          </View>
          <Text style={styles.playIcon}>▶</Text>
        </Pressable>
      ))}
      </View>

      {session && !result && (
        <MicrogameRunner
          key={`${session.game.id}-${session.nonce}`}
          game={session.game}
          difficulty={session.difficulty}
          rng={session.rng}
          onFinish={(r) => setResult(r)}
        />
      )}

      {session && result && (
        <View style={styles.resultOverlay}>
          <Text style={styles.resultText}>
            {result === 'win' ? t('biblioteca.win') : t('biblioteca.lose')}
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => play(session.game, session.difficulty, session.nonce + 1)}
          >
            <Text style={styles.primaryBtnText}>{t('biblioteca.playAgain')}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              setSession(null);
              setResult(null);
            }}
          >
            <Text style={styles.secondaryBtnText}>{t('biblioteca.exit')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listArea: { padding: 24, paddingTop: 16, gap: 10 },
  diffRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.bg.surface,
  },
  chipActive: { backgroundColor: colors.brand.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  chipTextActive: { color: '#ffffff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  rowSubtitle: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  playIcon: { fontSize: 18, color: colors.brand.primary },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 20,
  },
  resultText: { fontSize: 28, fontWeight: '900', color: colors.text.primary },
  primaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  secondaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brand.primary,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: colors.brand.primary },
});
