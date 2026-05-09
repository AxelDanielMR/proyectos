import { StyleSheet, View } from 'react-native';
import type { Board as SudokuBoard, Puzzle } from '@core/sudoku';
import { getPeers } from '@core/sudoku';
import type { SymbolPack } from '@core/symbols';
import { colors } from '@theme/colors';
import { Cell } from '../Cell';

export interface BoardProps {
  puzzle: Puzzle;
  board: SudokuBoard;
  selectedIndex: number | null;
  onCellPress: (index: number) => void;
  pack: SymbolPack;
  errorIndices?: ReadonlySet<number>;
  notes?: ReadonlyMap<number, ReadonlySet<number>>;
}

const THIN = StyleSheet.hairlineWidth;
const THICK = 2;
const NONE = 0;

const EMPTY_SET: ReadonlySet<number> = new Set();
const EMPTY_NOTES: ReadonlySet<number> = new Set();

function getBorderWidths(row: number, col: number): { right: number; bottom: number } {
  return {
    right: col === 8 ? NONE : col % 3 === 2 ? THICK : THIN,
    bottom: row === 8 ? NONE : row % 3 === 2 ? THICK : THIN,
  };
}

export function Board({
  puzzle,
  board,
  selectedIndex,
  onCellPress,
  pack,
  errorIndices = EMPTY_SET,
  notes,
}: BoardProps) {
  const peers = selectedIndex != null ? getPeers(selectedIndex) : null;

  return (
    <View style={styles.board}>
      {Array.from({ length: 9 }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: 9 }, (_, col) => {
            const idx = row * 9 + col;
            return (
              <Cell
                key={idx}
                value={(board[idx] ?? 0) as SudokuBoard[number]}
                isFixed={!!puzzle.initial[idx]}
                isSelected={selectedIndex === idx}
                isPeer={peers != null && peers.has(idx)}
                isError={errorIndices.has(idx)}
                notes={notes?.get(idx) ?? EMPTY_NOTES}
                pack={pack}
                onPress={() => onCellPress(idx)}
                borderWidths={getBorderWidths(row, col)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: THICK,
    borderColor: colors.board.thickLine,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
});
