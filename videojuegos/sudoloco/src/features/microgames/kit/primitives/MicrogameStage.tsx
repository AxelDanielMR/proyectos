import React, { createContext, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';

export interface StageSize {
  width: number;
  height: number;
}

const MAX_STAGE_WIDTH = 360;

export const StageSizeContext = createContext<StageSize>({ width: 0, height: 0 });

export function MicrogameStage({
  children,
  aspectRatio = 3 / 4,
}: {
  children: React.ReactNode;
  /** width/height del stage. Por defecto 3/4 (retrato genérico); un juego con
   * fondo propio puede pasar la proporción real de su arte para no recortarlo. */
  aspectRatio?: number;
}) {
  const [available, setAvailable] = useState<StageSize>({ width: 0, height: 0 });
  const [size, setSize] = useState<StageSize>({ width: 0, height: 0 });

  const onBackdropLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setAvailable({ width, height });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  // Encaja el stage dentro del espacio disponible en AMBOS ejes: con un
  // aspectRatio angosto (p. ej. el fondo propio de fishing), fijar solo el
  // ancho al 90% de la pantalla puede derivar un alto que no cabe verticalmente
  // y se recorta contra los bordes de la pantalla.
  const boxWidth =
    available.width > 0
      ? Math.min(available.width * 0.9, MAX_STAGE_WIDTH, available.height * 0.9 * aspectRatio)
      : 0;

  return (
    <View style={styles.backdrop} onLayout={onBackdropLayout} pointerEvents="auto">
      {boxWidth > 0 && (
        <View style={[styles.stage, { width: boxWidth, aspectRatio }]} onLayout={onLayout}>
          {size.width > 0 && (
            <StageSizeContext.Provider value={size}>{children}</StageSizeContext.Provider>
          )}
        </View>
      )}
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
    backgroundColor: '#dff0ff',
    borderRadius: 16,
    overflow: 'hidden',
  },
});
