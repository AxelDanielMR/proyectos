import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  showGoldenButton?: boolean;
}

export const SudokuGame = React.memo(function SudokuGame({
  store,
  pack,
  showHintButton = false,
  showGoldenButton = false,
}: SudokuGameProps) {
  const puzzle = useStore(store, (s) => s.puzzle);
  const board = useStore(store, (s) => s.board);
  const { selectedIndex, isNotesMode, hintsRemaining, goldenRemaining, isComplete } =
    useSudokuGameState(store);
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
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Board
        puzzle={puzzle}
        board={board}
        selectedIndex={selectedIndex}
        onCellPress={actions.select}
        pack={pack}
        errorIndices={errorIndices}
        notes={notesByCell}
      />

      {(showHintButton || showGoldenButton) && (
        <View style={styles.powerups}>
          {showHintButton && (
            <Pressable
              onPress={actions.useHint}
              disabled={hintsRemaining <= 0 || isComplete}
              style={[styles.powerupBtn, hintsRemaining <= 0 && styles.powerupDisabled]}
            >
              <Text style={styles.powerupIcon}>💡</Text>
              <Text style={styles.powerupCount}>{hintsRemaining}</Text>
            </Pressable>
          )}
          {showGoldenButton && (
            <Pressable
              onPress={actions.useGoldenCell}
              disabled={goldenRemaining <= 0 || isComplete}
              style={[styles.powerupBtn, goldenRemaining <= 0 && styles.powerupDisabled]}
            >
              <Text style={styles.powerupIcon}>⭐</Text>
              <Text style={styles.powerupCount}>{goldenRemaining}</Text>
            </Pressable>
          )}
        </View>
      )}

      <NumberPad
        pack={pack}
        onSelect={handleNumberSelect}
        onErase={actions.erase}
        onToggleNotes={actions.toggleNotesMode}
        isNotesMode={isNotesMode}
        disabled={isComplete}
      />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 12,
  },
  powerups: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  powerupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.bg.surface,
  },
  powerupDisabled: {
    opacity: 0.4,
  },
  powerupIcon: {
    fontSize: 16,
  },
  powerupCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
});
