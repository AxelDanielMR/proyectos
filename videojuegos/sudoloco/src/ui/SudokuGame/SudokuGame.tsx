import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from 'zustand/react';
import type { SymbolPack } from '@core/symbols';
import { colors } from '@theme/colors';
import { Board } from '../Board';
import { NumberPad } from '../NumberPad';
import type { SudokuGameStore } from './store';
import { useSudokuGameActions, useSudokuGameState } from './hooks';

interface SudokuGameProps {
  store: SudokuGameStore;
  pack: SymbolPack;
  showHintButton?: boolean;
  showSilverButton?: boolean;
  showGoldenButton?: boolean;
}

export const SudokuGame = React.memo(function SudokuGame({
  store,
  pack,
  showHintButton = false,
  showSilverButton = false,
  showGoldenButton = false,
}: SudokuGameProps) {
  const puzzle = useStore(store, (s) => s.puzzle);
  const board = useStore(store, (s) => s.board);
  const {
    selectedIndex,
    isNotesMode,
    hintsRemaining,
    silverRemaining,
    goldenRemaining,
    isGoldenMode,
    isComplete,
  } = useSudokuGameState(store);
  const actions = useSudokuGameActions(store);

  const errorIndices = useStore(store, (s) => s.errorIndices);
  const notesByCell = useStore(store, (s) => s.notesByCell);

  function handleNumberSelect(value: import('@core/sudoku').CellValue) {
    if (isNotesMode) {
      actions.toggleNote(value);
    } else {
      actions.place(value);
    }
  }

  return (
    <View style={styles.container} pointerEvents={isComplete ? 'none' : 'auto'}>
      <Board
        puzzle={puzzle}
        board={board}
        selectedIndex={selectedIndex}
        onCellPress={actions.select}
        pack={pack}
        errorIndices={errorIndices}
        notes={notesByCell}
      />

      {/* Golden mode banner */}
      {isGoldenMode && (
        <Pressable style={styles.goldenBanner} onPress={actions.cancelGoldenMode}>
          <Text style={styles.goldenBannerText}>✨ Toca una casilla para revelarla  ✕</Text>
        </Pressable>
      )}

      {/* Compact controls: powerups left, notes/erase right */}
      <View style={styles.controlsBar}>
        <View style={styles.controlsLeft}>
          {showHintButton && (
            <Pressable
              onPress={actions.useHint}
              disabled={hintsRemaining <= 0}
              style={[styles.controlBtn, hintsRemaining <= 0 && styles.controlDisabled]}
            >
              <Text style={styles.controlEmoji}>🔍</Text>
              <Text style={styles.controlCount}>{hintsRemaining}</Text>
            </Pressable>
          )}
          {showSilverButton && (
            <Pressable
              onPress={actions.useSilverCell}
              disabled={silverRemaining <= 0}
              style={[styles.controlBtn, silverRemaining <= 0 && styles.controlDisabled]}
            >
              <Text style={styles.controlEmoji}>🥈</Text>
              <Text style={styles.controlCount}>{silverRemaining}</Text>
            </Pressable>
          )}
          {showGoldenButton && (
            <Pressable
              onPress={actions.useGoldenCell}
              disabled={goldenRemaining <= 0}
              style={[styles.controlBtn, isGoldenMode && styles.controlBtnActive, goldenRemaining <= 0 && styles.controlDisabled]}
            >
              <Text style={styles.controlEmoji}>🥇</Text>
              <Text style={styles.controlCount}>{goldenRemaining}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.controlsRight}>
          <Pressable
            onPress={actions.toggleNotesMode}
            style={[styles.controlBtn, isNotesMode && styles.controlBtnActive]}
          >
            <Text style={styles.controlEmoji}>✏️</Text>
          </Pressable>
          <Pressable onPress={actions.erase} style={styles.controlBtn}>
            <Text style={styles.controlEmoji}>🧹</Text>
          </Pressable>
        </View>
      </View>

      <NumberPad
        pack={pack}
        onSelect={handleNumberSelect}
        disabled={isComplete}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    justifyContent: 'center',
  },
  goldenBanner: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
  },
  goldenBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.accent,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  controlsLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  controlsRight: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: colors.bg.surface,
  },
  controlBtnActive: {
    backgroundColor: colors.brand.primary,
  },
  controlDisabled: {
    opacity: 0.4,
  },
  controlEmoji: {
    fontSize: 16,
  },
  controlCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
});
