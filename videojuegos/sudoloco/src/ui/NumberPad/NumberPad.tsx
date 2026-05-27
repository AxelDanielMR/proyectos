import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { CellValue } from '@core/sudoku';
import type { SymbolItem, SymbolPack } from '@core/symbols';
import { colors } from '@theme/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface NumberPadProps {
  pack: SymbolPack;
  onSelect: (value: CellValue) => void;
  onErase: () => void;
  onToggleNotes: () => void;
  isNotesMode: boolean;
  disabled?: boolean;
  notesLabel?: string;
  eraseLabel?: string;
}

function PadButton({
  onPress,
  children,
  active = false,
}: {
  onPress: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.88, { damping: 15 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15 });
      }}
      style={[
        animatedStyle,
        styles.padButton,
        active && styles.padButtonActive,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

function SymbolContent({ item }: { item: SymbolItem }) {
  if (item.kind === 'text') {
    return (
      <Text style={styles.padText}>{item.value}</Text>
    );
  }
  if (item.kind === 'color') {
    return <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: item.hex }} />;
  }
  if (item.kind === 'image') {
    return <Image source={item.source} style={{ width: 36, height: 36 }} resizeMode="contain" />;
  }
  return null;
}

export function NumberPad({
  pack,
  onSelect,
  onErase,
  onToggleNotes,
  isNotesMode,
  disabled = false,
  notesLabel = 'Notas',
  eraseLabel = '⌫',
}: NumberPadProps) {
  return (
    <View style={[styles.pad, { opacity: disabled ? 0.4 : 1 }]} pointerEvents={disabled ? 'none' : 'auto'}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.row}>
          {[0, 1, 2].map((col) => {
            const n = (row * 3 + col + 1) as CellValue;
            const item = pack.items[n - 1];
            return (
              <PadButton key={n} onPress={() => onSelect(n)}>
                {item != null ? <SymbolContent item={item} /> : null}
              </PadButton>
            );
          })}
        </View>
      ))}

      <View style={[styles.row, { marginTop: 6 }]}>
        <PadButton onPress={onToggleNotes} active={isNotesMode}>
          <Text
            style={[
              styles.controlText,
              isNotesMode && { color: '#ffffff' },
            ]}
          >
            {notesLabel}
          </Text>
        </PadButton>
        <PadButton onPress={onErase}>
          <Text style={styles.controlText}>{eraseLabel}</Text>
        </PadButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  padButton: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
  },
  padButtonActive: {
    backgroundColor: colors.brand.primary,
  },
  padText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  controlText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
