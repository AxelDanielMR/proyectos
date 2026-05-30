import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { CellValue } from '@core/sudoku';
import type { SymbolItem, SymbolPack } from '@core/symbols';
import { colors } from '@theme/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface NumberPadProps {
  pack: SymbolPack;
  onSelect: (value: CellValue) => void;
  disabled?: boolean;
}

function PadButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.88, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
      style={[animatedStyle, styles.padButton]}
    >
      {children}
    </AnimatedPressable>
  );
}

function SymbolContent({ item }: { item: SymbolItem }) {
  if (item.kind === 'text') {
    return <Text style={styles.padText}>{item.value}</Text>;
  }
  if (item.kind === 'color') {
    return <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: item.hex }} />;
  }
  if (item.kind === 'image') {
    return <Image source={item.source} style={{ width: 28, height: 28 }} resizeMode="contain" />;
  }
  return null;
}

export function NumberPad({ pack, onSelect, disabled = false }: NumberPadProps) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    width: '78%',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  padButton: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.surface,
  },
  padText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
});
