import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { CellValue } from '@core/sudoku';
import type { SymbolItem, SymbolPack } from '@core/symbols';
import { colors } from '@theme/colors';

export interface CellProps {
  value: CellValue;
  isFixed: boolean;
  isSelected: boolean;
  isPeer: boolean;
  isError: boolean;
  notes: ReadonlySet<number>;
  pack: SymbolPack;
  onPress: () => void;
  borderWidths: { right: number; bottom: number };
}

function cellBg(
  isSelected: boolean,
  isError: boolean,
  isPeer: boolean,
  isFixed: boolean,
): string {
  if (isSelected) return colors.board.cellBgSelected;
  if (isError) return colors.board.cellBgError;
  if (isPeer) return colors.board.cellBgPeer;
  if (isFixed) return colors.board.cellBgFixed;
  return colors.board.cellBg;
}

function symbolColor(isFixed: boolean, isError: boolean): string {
  if (isError) return colors.state.danger;
  if (isFixed) return '#1e293b';
  return colors.brand.primary;
}

function SymbolDisplay({
  item,
  color,
  small = false,
}: {
  item: SymbolItem;
  color: string;
  small?: boolean;
}) {
  if (item.kind === 'text') {
    return (
      <Text
        numberOfLines={1}
        style={{ fontSize: small ? 7 : 20, fontWeight: '700', lineHeight: small ? 9 : 24, color }}
      >
        {item.value}
      </Text>
    );
  }
  const size = small ? 6 : 22;
  const imgSize = small ? 10 : 32;
  if (item.kind === 'color') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: item.hex }} />
    );
  }
  if (item.kind === 'image') {
    return <Image source={item.source} style={{ width: imgSize, height: imgSize }} resizeMode="contain" />;
  }
  return null;
}

function NotesGrid({ notes, pack }: { notes: ReadonlySet<number>; pack: SymbolPack }) {
  return (
    <View style={styles.notesGrid}>
      {Array.from({ length: 9 }, (_, i) => {
        const n = i + 1;
        const item = pack.items[i];
        return (
          <View key={n} style={styles.noteCell}>
            {notes.has(n) && item != null ? (
              <View style={{ opacity: 0.45 }}>
                <SymbolDisplay item={item} color={colors.text.muted} small />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function Cell({
  value,
  isFixed,
  isSelected,
  isPeer,
  isError,
  notes,
  pack,
  onPress,
  borderWidths,
}: CellProps) {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const prevError = useRef(false);

  useEffect(() => {
    if (isError && !prevError.current) {
      translateX.value = withSequence(
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
    prevError.current = isError;
  }, [isError, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const bg = cellBg(isSelected, isError, isPeer, isFixed);
  const item = value !== 0 ? pack.items[value - 1] : undefined;
  const showNotes = value === 0 && notes.size > 0;
  const borderRightColor = borderWidths.right >= 2 ? colors.board.thickLine : colors.board.line;
  const borderBottomColor = borderWidths.bottom >= 2 ? colors.board.thickLine : colors.board.line;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.88, { damping: 15 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15 });
      }}
      style={[
        styles.cell,
        {
          backgroundColor: bg,
          borderRightWidth: borderWidths.right,
          borderBottomWidth: borderWidths.bottom,
          borderRightColor,
          borderBottomColor,
        },
      ]}
    >
      <Animated.View style={[styles.inner, animatedStyle]}>
        {showNotes ? (
          <NotesGrid notes={notes} pack={pack} />
        ) : item != null ? (
          <SymbolDisplay item={item} color={symbolColor(isFixed, isError)} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 1,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
  },
  noteCell: {
    width: '33.33%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
