import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '@theme/colors';
import { backgrounds, type BackgroundId } from './backgrounds';

/**
 * Geometría del arte. El marco es una imagen de 71×145 px con dos ventanas
 * vacías: arriba va el tablero, abajo el numpad (con los items encima). Las
 * ventanas se expresan como fracciones del marco para que escalen con él.
 *
 * Para afinar la alineación en dispositivo, ajusta SOLO estos números (en px
 * del arte original 71×145); el resto del layout se deriva de aquí.
 */
const ART_W = 71;
const ART_H = 145;

const WINDOW_BOARD = rect(8, 12, 64, 77); // recuadro superior (tablero)
const WINDOW_CONTROLS = rect(8, 93, 64, 134); // recuadro inferior (items + numpad)

function rect(left: number, top: number, right: number, bottom: number) {
  return {
    left: `${(left / ART_W) * 100}%`,
    top: `${(top / ART_H) * 100}%`,
    width: `${((right - left) / ART_W) * 100}%`,
    height: `${((bottom - top) / ART_H) * 100}%`,
  } as const;
}

interface PlayfieldBackgroundProps {
  backgroundId: BackgroundId;
  /** 0 = ritmo normal, 1 = a punto de perder. Acelera la animación. */
  urgency?: number;
  /** Congela la animación (pausa, microjuego, game over). */
  paused?: boolean;
  /** Intervalo entre frames en reposo (urgency = 0). */
  baseInterval?: number; // 240ms en ritmo normal
  /** Intervalo mínimo en urgencia máxima (urgency = 1). Muy bajo = frenético. */
  minInterval?: number;
  /** Contenido que se ancla a la ventana superior del marco (tablero). */
  boardSlot?: ReactNode;
  /** Contenido que se ancla a la ventana inferior del marco (items + numpad). */
  controlsSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

function intervalFor(urgency: number, baseInterval: number, minInterval: number): number {
  const u = Math.max(0, Math.min(1, urgency));
  // Cuadrática: rampa perceptible desde 30s y frenética cerca de 0.
  return baseInterval - u * u * (baseInterval - minInterval);
}

export const PlayfieldBackground = React.memo(function PlayfieldBackground({
  backgroundId,
  urgency = 0,
  paused = false,
  baseInterval = 240,
  minInterval = 28,
  boardSlot,
  controlsSlot,
  style,
}: PlayfieldBackgroundProps) {
  const frames = backgrounds[backgroundId];
  const [index, setIndex] = useState(0);

  // Tamaño "contain": el marco se ancla al ancho manteniendo proporción 71:145,
  // sin recortar las ventanas, dejando barras de color base donde sobre.
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    const aspect = ART_W / ART_H;
    const w = width / height < aspect ? width : height * aspect;
    setFrameSize({ width: w, height: w / aspect });
  }

  // Refs leídos por el loop sin reprogramarlo en cada cambio de urgencia.
  const urgencyRef = useRef(urgency);
  const pausedRef = useRef(paused);
  urgencyRef.current = urgency;
  pausedRef.current = paused;

  useEffect(() => {
    if (frames.length <= 1) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      if (!active) return;
      const delay = intervalFor(urgencyRef.current, baseInterval, minInterval);
      timer = setTimeout(() => {
        if (!pausedRef.current) setIndex((i) => (i + 1) % frames.length);
        loop();
      }, delay);
    };
    loop();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [frames, baseInterval, minInterval]);

  return (
    <View style={[styles.outer, style]} onLayout={onLayout}>
      {/* Marco anclado al ancho, proporción fija del arte. */}
      <View style={[styles.frame, frameSize]}>
        {frameSize != null && frames.map((src, i) => (
          <Image
            key={i}
            source={src}
            resizeMode="contain"
            fadeDuration={0}
            style={[styles.frameImg, { opacity: i === index ? 1 : 0 }]}
          />
        ))}

        {boardSlot != null && <View style={[styles.slot, WINDOW_BOARD]}>{boardSlot}</View>}
        {controlsSlot != null && (
          <View style={[styles.slot, WINDOW_CONTROLS]}>{controlsSlot}</View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.bg.base,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  frame: {
    position: 'relative',
  },
  frameImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  slot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
