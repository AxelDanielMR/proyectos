import React, { createContext, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';

export interface StageSize {
  width: number;
  height: number;
}

export const StageSizeContext = createContext<StageSize>({ width: 0, height: 0 });

export function MicrogameStage({ children }: { children: React.ReactNode }) {
  const [size, setSize] = useState<StageSize>({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={styles.backdrop} pointerEvents="auto">
      <View style={styles.stage} onLayout={onLayout}>
        {size.width > 0 && (
          <StageSizeContext.Provider value={size}>{children}</StageSizeContext.Provider>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: '90%',
    maxWidth: 360,
    aspectRatio: 3 / 4,
    backgroundColor: '#dff0ff',
    borderRadius: 16,
    overflow: 'hidden',
  },
});
