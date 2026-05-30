import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@theme/colors';

interface LivesDisplayProps {
  lives: number;
  crystalHearts: number;
}

export const LivesDisplay = React.memo(function LivesDisplay({ lives, crystalHearts }: LivesDisplayProps) {
  return (
    <View style={styles.livesRow}>
      {Array.from({ length: 3 }, (_, i) => (
        <Text key={i} style={[styles.heart, i >= lives && styles.heartLost]}>♥</Text>
      ))}
      {Array.from({ length: crystalHearts }, (_, i) => (
        <Text key={`c-${i}`} style={styles.crystalHeart}>◇</Text>
      ))}
    </View>
  );
});

interface TimerDisplayProps {
  timeRemaining: number;
}

export const TimerDisplay = React.memo(function TimerDisplay({ timeRemaining }: TimerDisplayProps) {
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

export const ScoreDisplay = React.memo(function ScoreDisplay({ score, level }: ScoreDisplayProps) {
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.levelLabel}>Nv {level}</Text>
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
    fontSize: 22,
    color: colors.brand.primary,
  },
  heartLost: {
    opacity: 0.25,
  },
  crystalHeart: {
    fontSize: 20,
    color: '#93c5fd',
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
