import { ImageBackground, StyleSheet, View } from 'react-native';
import type { Board as SudokuBoard, Puzzle } from '@core/sudoku';
import { getPeers } from '@core/sudoku';
import type { SymbolPack } from '@core/symbols';
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

const EMPTY_SET: ReadonlySet<number> = new Set();
const NO_BORDER = { right: 0, bottom: 0 } as const;

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
    <ImageBackground
      source={require('../../../assets/grids/grid_flowers_roses.png')}
      resizeMode="stretch"
      style={styles.board}
    >
      {/* Inner padding lets the image frame show around the cells */}
      <View style={styles.inner}>
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
                  notes={notes?.get(idx) ?? new Set()}
                  pack={pack}
                  onPress={() => onCellPress(idx)}
                  borderWidths={NO_BORDER}
                />
              );
            })}
          </View>
        ))}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  board: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#ffffff',
  },
  inner: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
});
