import React, { createContext, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';

export interface StageSize {
  width: number;
  height: number;
}

const MAX_STAGE_WIDTH = 480;

export const StageSizeContext = createContext<StageSize>({
  width: 0,
  height: 0,
});

export function MicrogameStage({
  children,
  aspectRatio = 3 / 4,
}: {
  children: React.ReactNode;
  /** width/height del stage. Por defecto 3/4 (retrato genérico); un juego con
   * fondo propio puede pasar la proporción real de su arte para no recortarlo. */
  aspectRatio?: number;
}) {
  const [available, setAvailable] = useState<StageSize>({
    width: 0,
    height: 0,
  });

  const onBackdropLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setAvailable({ width, height });
  };

  // Encaja el stage dentro del espacio disponible en AMBOS ejes.
  // Se aumenta la cobertura al 95% del espacio disponible y el ancho máximo a 480
  // para que en pantallas grandes el juego no se vea pequeño.
  const boxWidth =
    available.width > 0
      ? Math.min(
          available.width * 0.95,
          MAX_STAGE_WIDTH,
          available.height * 0.95 * aspectRatio,
        )
      : 0;
  const boxHeight = boxWidth / aspectRatio;


  return (
    <View
      style={styles.backdrop}
      onLayout={onBackdropLayout}
      pointerEvents="auto"
    >
      {boxWidth > 0 && (
        <View style={[styles.stage, { width: boxWidth, height: boxHeight }]}>
          <StageSizeContext.Provider
            value={{ width: boxWidth, height: boxHeight }}
          >
            {children}
          </StageSizeContext.Provider>
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
