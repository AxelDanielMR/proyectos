import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { StageSizeContext } from '../../kit/primitives/MicrogameStage';
import { TapZone } from '../../kit/primitives/TapZone';
import { useLatestRef } from '../../kit/primitives/useLatestRef';
import type { Microgame, MicrogameProps, MicrogameResult } from '../../types';
import { buildConfig, fishFrame } from './fishing.logic';
import {
  BACKGROUND,
  CHARACTER,
  CHARACTER_LOSE_FRAMES,
  BITE_LOOP_FRAMES,
  FISH,
  WATER_COLOR,
} from './assets';

// El stage adopta la proporción real del fondo en vez del 3/4 genérico, así el
// arte (fondo, personaje y frames) no se recorta al encajar en el box.
const backgroundSize = Image.resolveAssetSource(BACKGROUND);
const STAGE_ASPECT_RATIO = backgroundSize
  ? backgroundSize.width / backgroundSize.height
  : 3 / 4;

const DURATION_MS = 6000;
// El propio juego debe detectar el timeout ANTES que el runner (mismo DURATION_MS
// en el descriptor de abajo) para alcanzar a mostrar el rebote de derrota — si
// gana el runner, hasOwnReveal corta la escena sin avisar (ver runner.tsx).
const TIMEOUT_MARGIN_MS = 400;
const BITE_LOOP_INTERVAL_MS = 220;
const LOSE_FRAME_INTERVAL_MS = 420;
const WIN_REVEAL_MS = 500;
const LOSE_REVEAL_MS = 1600;

const Fishing: React.FC<MicrogameProps> = ({
  difficulty,
  rng,
  onResult,
  onReveal,
}) => {
  // Config fija por partida: consumir el rng una sola vez. Deliberadamente
  // NO depende de difficulty/rng: recalcular con la próxima identidad del rng
  // (aún si fuera la "misma" partida) volvería a tirar del PRNG y cambiaría el
  // puzzle determinista de este microjuego.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const config = useMemo(() => buildConfig(difficulty, rng), []);
  const stage = useContext(StageSizeContext);
  const [biting, setBiting] = useState(false);
  const [taps, setTaps] = useState(0);
  const [loopTick, setLoopTick] = useState(0);
  const [loseFrame, setLoseFrame] = useState(0);
  const [phase, setPhase] = useState<'playing' | MicrogameResult>('playing');
  const resolvedRef = useRef(false);

  const finish = (r: MicrogameResult) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResult(r);
  };
  const finishRef = useLatestRef(finish);
  const onRevealRef = useLatestRef(onReveal);

  useEffect(() => {
    const id = setTimeout(() => setBiting(true), config.biteDelayMs);
    return () => clearTimeout(id);
  }, [config.biteDelayMs]);

  // Derrota por tiempo: si no se atrapó el pez, cortamos antes que el runner.
  useEffect(() => {
    const id = setTimeout(
      () => setPhase((p) => (p === 'playing' ? 'lose' : p)),
      DURATION_MS - TIMEOUT_MARGIN_MS,
    );
    return () => clearTimeout(id);
  }, []);

  // Loop continuo del indicador de pique mientras se puede tapear.
  useEffect(() => {
    if (!biting || phase !== 'playing') return;
    const id = setInterval(
      () => setLoopTick((t) => t + 1),
      BITE_LOOP_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [biting, phase]);

  // Rebote (alterna frames) del personaje durante la revelación de derrota.
  useEffect(() => {
    if (phase !== 'lose') return;
    const id = setInterval(
      () => setLoseFrame((f) => (f === 0 ? 1 : 0)),
      LOSE_FRAME_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [phase]);

  // El resultado se reporta al terminar la revelación, no al detectarse — así el
  // jugador alcanza a verla antes de que el runner cierre. `onReveal` congela el
  // timer del runner mientras tanto (ver types.ts). Los callbacks van por ref: el
  // efecto solo debe reiniciar el timeout cuando cambia `phase`.
  useEffect(() => {
    if (phase === 'playing') return;
    onRevealRef.current?.();
    const id = setTimeout(
      () => finishRef.current(phase),
      phase === 'win' ? WIN_REVEAL_MS : LOSE_REVEAL_MS,
    );
    return () => clearTimeout(id);
  }, [phase, finishRef, onRevealRef]);

  const handleTap = () => {
    if (!biting || phase !== 'playing') return;
    const next = taps + 1;
    setTaps(next);
    if (next >= config.tapsRequired) setPhase('win');
  };

  const loopFrame =
    BITE_LOOP_FRAMES[fishFrame(loopTick, BITE_LOOP_FRAMES.length)];

  return (
    <TapZone
      x={0}
      y={0}
      width={stage.width}
      height={stage.height}
      onTap={handleTap}
    >
      <View style={styles.scene}>
        <Image source={BACKGROUND} style={styles.layer} resizeMode="cover" />

        {phase === 'lose' ? (
          <>
            <Image
              source={CHARACTER_LOSE_FRAMES[0]}
              style={[styles.layer, { opacity: loseFrame === 0 ? 1 : 0 }]}
              resizeMode="cover"
            />
            <Image
              source={CHARACTER_LOSE_FRAMES[1]}
              style={[styles.layer, { opacity: loseFrame === 1 ? 1 : 0 }]}
              resizeMode="cover"
            />
          </>
        ) : (
          <Image source={CHARACTER} style={styles.layer} resizeMode="cover" />
        )}

        {phase === 'playing' && biting && loopFrame !== undefined && (
          <Image source={loopFrame} style={styles.layer} resizeMode="cover" />
        )}

        {phase === 'win' && (
          <View style={styles.fishOverlay} pointerEvents="none">
            <Text style={styles.fish}>{FISH.emoji}</Text>
          </View>
        )}
      </View>
    </TapZone>
  );
};

export const fishing: Microgame = {
  id: 'fishing',
  nameKey: 'microgames.fishing',
  category: 'tap-spam',
  minLevel: 1,
  durationMs: DURATION_MS,
  Component: Fishing,
  hasOwnReveal: true,
  stageAspectRatio: STAGE_ASPECT_RATIO,
  instructions: [
    { hand: 'pointer', durationMs: 200 },
    { hand: 'clicking', particles: true, durationMs: 140 },
    { hand: 'pointer', durationMs: 120 },
    { hand: 'clicking', particles: true, durationMs: 140 },
    { hand: 'pointer', durationMs: 120 },
    { hand: 'clicking', particles: true, durationMs: 140 },
    { hand: 'pointer', durationMs: 120 },
    { hand: 'clicking', particles: true, durationMs: 140 },
  ],
};

const styles = StyleSheet.create({
  scene: { width: '100%', height: '100%', backgroundColor: WATER_COLOR },
  layer: { ...StyleSheet.absoluteFillObject },
  fishOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fish: { fontSize: 110 },
});
