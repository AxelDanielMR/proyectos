import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@ui/primitives/Text';
import { useStore } from 'zustand/react';
import type { SymbolPack } from '@core/symbols';
import { colors } from '@theme/colors';
import { actionIcons } from '@ui/icons';
import { Board } from '../Board';
import { NumberPad } from '../NumberPad';
import { PlayfieldBackground, type BackgroundId } from '../PlayfieldBackground';
import type { SudokuGameStore } from './store';
import { useSudokuGameActions, useSudokuGameState } from './hooks';

interface SudokuGameTemplate {
  backgroundId: BackgroundId;
  urgency?: number;
  paused?: boolean;
}

interface SudokuGameProps {
  store: SudokuGameStore;
  pack: SymbolPack;
  showHintButton?: boolean;
  showSilverButton?: boolean;
  showGoldenButton?: boolean;
  /** Si se pasa, el tablero/numpad se anclan a las ventanas del marco animado. */
  template?: SudokuGameTemplate | null;
}

export const SudokuGame = React.memo(function SudokuGame({
  store,
  pack,
  showHintButton = false,
  showSilverButton = false,
  showGoldenButton = false,
  template = null,
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

  const boardEl = (
    <Board
      puzzle={puzzle}
      board={board}
      selectedIndex={selectedIndex}
      onCellPress={actions.select}
      pack={pack}
      errorIndices={errorIndices}
      notes={notesByCell}
    />
  );

  const goldenBannerEl = isGoldenMode ? (
    <Pressable style={styles.goldenBanner} onPress={actions.cancelGoldenMode}>
      <Text style={styles.goldenBannerText}>✨ Toca una casilla para revelarla  ✕</Text>
    </Pressable>
  ) : null;

  const controlsBarEl = (
    <View style={styles.controlsBar}>
      <View style={styles.controlsLeft}>
        {showHintButton && (
          <Pressable
            onPress={actions.useHint}
            disabled={hintsRemaining <= 0}
            style={[styles.controlBtn, hintsRemaining <= 0 && styles.controlDisabled]}
          >
            <Image source={actionIcons.hint} style={styles.controlIcon} resizeMode="contain" />
            <Text style={styles.controlCount}>{hintsRemaining}</Text>
          </Pressable>
        )}
        {showSilverButton && (
          <Pressable
            onPress={actions.useSilverCell}
            disabled={silverRemaining <= 0}
            style={[styles.controlBtn, silverRemaining <= 0 && styles.controlDisabled]}
          >
            <Image source={actionIcons.silverCell} style={styles.controlIcon} resizeMode="contain" />
            <Text style={styles.controlCount}>{silverRemaining}</Text>
          </Pressable>
        )}
        {showGoldenButton && (
          <Pressable
            onPress={actions.useGoldenCell}
            disabled={goldenRemaining <= 0}
            style={[styles.controlBtn, isGoldenMode && styles.controlBtnActive, goldenRemaining <= 0 && styles.controlDisabled]}
          >
            <Image source={actionIcons.goldenCell} style={styles.controlIcon} resizeMode="contain" />
            <Text style={styles.controlCount}>{goldenRemaining}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.controlsRight}>
        <Pressable
          onPress={actions.toggleNotesMode}
          style={[styles.controlBtn, isNotesMode && styles.controlBtnActive]}
        >
          <Image source={actionIcons.pencil} style={styles.controlIcon} resizeMode="contain" />
        </Pressable>
        <Pressable onPress={actions.erase} style={styles.controlBtn}>
          <Image source={actionIcons.eraser} style={styles.controlIcon} resizeMode="contain" />
        </Pressable>
      </View>
    </View>
  );

  const numpadEl = (
    <NumberPad
      pack={pack}
      onSelect={handleNumberSelect}
      disabled={isComplete}
      widthPercent={template ? '100%' : '78%'}
    />
  );

  // Columna de acciones a la derecha del tablero (modo template). Los power-ups
  // se muestran SIEMPRE, atenuados cuando no quedan, para que el espacio sea estable.
  const columnEl = (
    <View style={styles.templateButtonColumn}>
      <Pressable
        onPress={actions.useHint}
        disabled={hintsRemaining <= 0}
        style={[styles.columnBtn, hintsRemaining <= 0 && styles.controlDisabled]}
      >
        <Image source={actionIcons.hint} style={styles.controlIcon} resizeMode="contain" />
        <Text style={styles.controlCount}>{hintsRemaining}</Text>
      </Pressable>
      <Pressable
        onPress={actions.useSilverCell}
        disabled={silverRemaining <= 0}
        style={[styles.columnBtn, silverRemaining <= 0 && styles.controlDisabled]}
      >
        <Image source={actionIcons.silverCell} style={styles.controlIcon} resizeMode="contain" />
        <Text style={styles.controlCount}>{silverRemaining}</Text>
      </Pressable>
      <Pressable
        onPress={actions.useGoldenCell}
        disabled={goldenRemaining <= 0}
        style={[styles.columnBtn, isGoldenMode && styles.controlBtnActive, goldenRemaining <= 0 && styles.controlDisabled]}
      >
        <Image source={actionIcons.goldenCell} style={styles.controlIcon} resizeMode="contain" />
        <Text style={styles.controlCount}>{goldenRemaining}</Text>
      </Pressable>
      <Pressable
        onPress={actions.toggleNotesMode}
        style={[styles.columnBtn, isNotesMode && styles.controlBtnActive]}
      >
        <Image source={actionIcons.pencil} style={styles.controlIcon} resizeMode="contain" />
      </Pressable>
      <Pressable onPress={actions.erase} style={styles.columnBtn}>
        <Image source={actionIcons.eraser} style={styles.controlIcon} resizeMode="contain" />
      </Pressable>
    </View>
  );

  if (template) {
    return (
      <PlayfieldBackground
        backgroundId={template.backgroundId}
        urgency={template.urgency}
        paused={template.paused}
        boardSlot={
          <View style={styles.templateBoardWrap} pointerEvents={isComplete ? 'none' : 'auto'}>
            {boardEl}
          </View>
        }
        controlsSlot={
          <View style={styles.templateControls} pointerEvents={isComplete ? 'none' : 'auto'}>
            {goldenBannerEl}
            <View style={styles.templateControlsRow}>
              <View style={styles.templateNumpadWrap}>{numpadEl}</View>
              {columnEl}
            </View>
          </View>
        }
      />
    );
  }

  return (
    <View style={styles.container} pointerEvents={isComplete ? 'none' : 'auto'}>
      {boardEl}
      {goldenBannerEl}
      {controlsBarEl}
      {numpadEl}
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
  // 110% = tablero 10% más grande; rebasa un poco la ventana hacia los lados.
  templateBoardWrap: {
    width: '110%',
  },
  // Numpad + columna de botones, lado a lado, dentro de la ventana inferior.
  templateControlsRow: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  // Numpad cuadrado del alto de la ventana inferior (máximo sin desbordar).
  templateNumpadWrap: {
    height: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateButtonColumn: {
    justifyContent: 'center',
    gap: 8,
  },
  columnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bg.surface,
  },
  templateControls: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    gap: 6,
  },
  // Acota el numpad para que su forma cuadrada quepa en la ventana inferior.
  // Ajustar este % si el numpad se sale o queda chico en dispositivo.
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
  controlIcon: {
    width: 20,
    height: 20,
  },
  controlCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
});
