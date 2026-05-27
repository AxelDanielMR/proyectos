import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@theme/colors';

// --- LivesDisplay ---

interface LivesDisplayProps {
  lives: number;
}

export const LivesDisplay = React.memo(function LivesDisplay({
  lives,
}: LivesDisplayProps) {
  return (
    <View style={styles.livesRow}>
      {Array.from({ length: 3 }, (_, i) => (
        <Text key={i} style={[styles.heart, i >= lives && styles.heartLost]}>
          ♥
        </Text>
      ))}
    </View>
  );
});

// --- TimerDisplay ---

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

// --- ScoreDisplay ---

interface ScoreDisplayProps {
  score: number;
  level: number;
}

export const ScoreDisplay = React.memo(function ScoreDisplay({
  score,
  level,
}: ScoreDisplayProps) {
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.levelLabel}>Nv {level}</Text>
      <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
    </View>
  );
});

// --- Styles ---

const styles = StyleSheet.create({
  livesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  heart: {
    fontSize: 22,
    color: colors.brand.primary,
  },
  heartLost: {
    opacity: 0.25,
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
    color: colors.brand.primary,
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
