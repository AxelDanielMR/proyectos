import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@ui/primitives/Text';
import { colors } from '@theme/colors';
import { actionIcons } from '@ui/icons';

interface LivesDisplayProps {
  lives: number;
  crystalHearts: number;
}

export const LivesDisplay = React.memo(function LivesDisplay({
  lives,
  crystalHearts,
}: LivesDisplayProps) {
  // Vidas dinámicas: se dibuja un corazón por vida actual (sin tope de 3).
  return (
    <View style={styles.livesRow}>
      {Array.from({ length: Math.max(0, lives) }, (_, i) => (
        <Image
          key={i}
          source={actionIcons.heart}
          style={styles.heart}
          resizeMode="contain"
        />
      ))}
      {Array.from({ length: crystalHearts }, (_, i) => (
        <Image
          key={`c-${i}`}
          source={actionIcons.frozenHeart}
          style={styles.crystalHeart}
          resizeMode="contain"
        />
      ))}
    </View>
  );
});

interface TimerDisplayProps {
  timeRemaining: number;
}

export const TimerDisplay = React.memo(function TimerDisplay({
  timeRemaining,
}: TimerDisplayProps) {
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isLow = timeRemaining <= 10;

  return (
    <View style={styles.timerBox}>
      <Text style={[styles.timerText, isLow && styles.timerLow]}>{label}</Text>
    </View>
  );
});

interface ScoreDisplayProps {
  score: number;
  level: number;
}

export const ScoreDisplay = React.memo(function ScoreDisplay({
  score,
  level,
}: ScoreDisplayProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.levelLabel}>
        {t('sudoloco.levelShort', { level })}
      </Text>
      <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  livesRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  heart: {
    width: 24,
    height: 24,
  },
  crystalHeart: {
    width: 22,
    height: 22,
  },
  timerBox: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.bg.surface,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  timerLow: {
    color: colors.state.danger,
  },
  scoreBox: {
    alignItems: 'flex-end',
  },
  levelLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
});
