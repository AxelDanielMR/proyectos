import { Accelerometer } from 'expo-sensors';
import { type ReactNode, useEffect, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const CREAM = '#efe1c6';
const CREAM_RGB = '239, 225, 198';
const GRID_INK = '#3d260f';
const GRID_CELL = 36;
const FADE_BANDS = 16;
const NUMBER_PARTICLE_COUNT = 22;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

type NumberParticleProps = {
  startX: number;
  value: number;
  delay: number;
  duration: number;
  travel: number;
  fontSize: number;
  drift: number;
  baseOpacity: number;
  dirX: SharedValue<number>;
  dirY: SharedValue<number>;
};

function NumberParticle({
  startX,
  value,
  delay,
  duration,
  travel,
  fontSize,
  drift,
  baseOpacity,
  dirX,
  dirY,
}: NumberParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false),
    );
  }, [progress, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const fadeIn = progress.value < 0.15 ? progress.value / 0.15 : 1;
    const fadeOut =
      progress.value > 0.75 ? Math.max(0, 1 - (progress.value - 0.75) / 0.25) : 1;
    const wave = drift * Math.sin(progress.value * Math.PI);
    return {
      transform: [
        { translateX: progress.value * travel * dirX.value + wave },
        { translateY: progress.value * travel * dirY.value },
      ],
      opacity: Math.min(fadeIn, fadeOut) * baseOpacity,
    };
  });

  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: startX,
          color: GRID_INK,
          fontWeight: '900',
          fontSize,
        },
        animatedStyle,
      ]}
    >
      {value}
    </Animated.Text>
  );
}

type SudokuBackgroundProps = {
  children?: ReactNode;
  particleSeed?: number;
};

export function SudokuBackground({
  children,
  particleSeed = 7,
}: SudokuBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const cols = Math.ceil(width / GRID_CELL) + 1;
  const rows = Math.ceil(height / GRID_CELL) + 1;

  // Cascade direction. Defaults to flowing upward (dirX=0, dirY=-1).
  // Updated from accelerometer to flow opposite to gravity.
  const dirX = useSharedValue(0);
  const dirY = useSharedValue(-1);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const available = await Accelerometer.isAvailableAsync().catch(() => false);
      if (!available || cancelled) return;
      Accelerometer.setUpdateInterval(120);
      subscription = Accelerometer.addListener(({ x }) => {
        // Siempre sube (dirY = -1). Solo el eje X responde a la inclinación,
        // con sensibilidad reducida y un cap para que el efecto sea sutil.
        const TILT_SENSITIVITY = 0.35;
        const MAX_TILT = 0.45;
        const tx = Math.max(-MAX_TILT, Math.min(MAX_TILT, -x * TILT_SENSITIVITY));
        dirX.value = withTiming(tx, { duration: 400 });
      });
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [dirX, dirY]);

  const numberParticles = useMemo(() => {
    const rnd = seededRandom(particleSeed);
    return Array.from({ length: NUMBER_PARTICLE_COUNT }, (_, i) => ({
      id: i,
      startX: rnd() * (width - 20) + 10,
      value: 1 + Math.floor(rnd() * 9),
      delay: Math.floor(rnd() * 6000),
      duration: 5500 + Math.floor(rnd() * 4500),
      travel: height * (0.6 + rnd() * 0.1),
      fontSize: 11 + Math.floor(rnd() * 5),
      drift: (rnd() - 0.5) * 24,
      baseOpacity: 0.35 + rnd() * 0.25,
    }));
  }, [width, height, particleSeed]);

  return (
    <View style={{ flex: 1, backgroundColor: CREAM, overflow: 'hidden' }}>
      {/* Grid: vertical lines */}
      {Array.from({ length: cols }).map((_, i) => (
        <View
          key={`v-${i}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: i * GRID_CELL,
            width: i % 3 === 0 ? 2.5 : 1.4,
            backgroundColor: GRID_INK,
            opacity: i % 3 === 0 ? 0.6 : 0.4,
          }}
        />
      ))}
      {/* Grid: horizontal lines */}
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={`h-${i}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: i * GRID_CELL,
            height: i % 3 === 0 ? 2.5 : 1.4,
            backgroundColor: GRID_INK,
            opacity: i % 3 === 0 ? 0.6 : 0.4,
          }}
        />
      ))}

      {/* Cascada de números: anclados al borde inferior, suben por defecto. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: height - 24,
          height: 24,
        }}
      >
        {numberParticles.map((p) => (
          <NumberParticle
            key={p.id}
            startX={p.startX}
            value={p.value}
            delay={p.delay}
            duration={p.duration}
            travel={p.travel}
            fontSize={p.fontSize}
            drift={p.drift}
            baseOpacity={p.baseOpacity}
            dirX={dirX}
            dirY={dirY}
          />
        ))}
      </View>

      {/* Fade overlay: crema arriba, desvanecida cerca del fondo. */}
      {Array.from({ length: FADE_BANDS }).map((_, i) => {
        const bandH = height / FADE_BANDS;
        const t = i / (FADE_BANDS - 1);
        const alpha = t < 0.88 ? Math.pow(1 - t / 0.88, 0.55) : 0;
        if (alpha === 0) return null;
        return (
          <View
            key={`fade-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: i * bandH,
              left: 0,
              right: 0,
              height: bandH + 1,
              backgroundColor: `rgba(${CREAM_RGB}, ${alpha})`,
            }}
          />
        );
      })}

      {children}
    </View>
  );
}
