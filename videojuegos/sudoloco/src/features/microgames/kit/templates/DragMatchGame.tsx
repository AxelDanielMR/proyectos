import React, { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { StageSizeContext } from '../primitives/MicrogameStage';
import { Draggable } from '../primitives/Draggable';
import { FrameBounce } from '../primitives/FrameBounce';
import { useLatestRef } from '../primitives/useLatestRef';
import { VisualView } from '../primitives/VisualView';
import {
  resolveDrop,
  isMatchCorrect,
  type DropTargetHit,
} from './dragMatch.logic';
import type { MicrogameResult, Visual } from '../../types';

export interface DragMatchTargetConfig {
  id: string;
  visual: Visual;
  /** Frames que alterna al ganar SIN haber recibido su draggable. Sin esto, no hay reveal animado. */
  winFrames?: [Visual, Visual];
  /** Frames que alterna al ganar HABIENDO recibido su draggable correcto. */
  winWithItemFrames?: [Visual, Visual];
  /** Frames que alterna al perder (con o sin draggable recibido). */
  loseFrames?: [Visual, Visual];
}

export interface DragMatchDraggableConfig {
  id: string;
  targetId: string; // a qué target pertenece
  visual: Visual;
}

export interface DragMatchConfig {
  targets: DragMatchTargetConfig[];
  draggables: DragMatchDraggableConfig[];
}

const ENTITY = 64;

// Al ganar, el bamboleo es más animado y corto; al perder, más lento y con más
// recorrido. Ambos usan easing suave (ease-in-out) en FrameBounce.
const WIN_REVEAL_MS = 1600;
const WIN_FRAME_MS = 220;
const WIN_TRAVEL_PX = 28;
const LOSE_REVEAL_MS = 2400;
const LOSE_FRAME_MS = 420;
const LOSE_TRAVEL_PX = 40;

export function DragMatchGame({
  config,
  onResult,
  onReveal,
}: {
  config: DragMatchConfig;
  onResult: (r: MicrogameResult) => void;
  onReveal?: () => void;
}) {
  const { width, height } = useContext(StageSizeContext);
  const resolvedRef = useRef(false);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<'playing' | MicrogameResult>('playing');

  const finish = (r: MicrogameResult) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResult(r);
  };
  const finishRef = useLatestRef(finish);
  const onRevealRef = useLatestRef(onReveal);

  // El resultado se reporta al terminar la revelación (personajes bamboleándose),
  // no al detectarse — así el jugador alcanza a verla antes de que el runner cierre.
  // `onReveal` congela el timer del runner mientras tanto (ver types.ts). Los
  // callbacks van por ref: el efecto solo debe reiniciar el timeout cuando cambia
  // `phase`, no cada vez que el padre pasa una nueva identidad de función.
  useEffect(() => {
    if (phase === 'playing') return;
    onRevealRef.current?.();
    const id = setTimeout(
      () => finishRef.current(phase),
      phase === 'win' ? WIN_REVEAL_MS : LOSE_REVEAL_MS,
    );
    return () => clearTimeout(id);
  }, [phase, finishRef, onRevealRef]);

  // Targets: fila inferior, repartidos horizontalmente.
  const targetY = height * 0.62;
  const targetSlot = width / config.targets.length;
  // Radio acotado a medio slot para que los círculos de targets adyacentes no se
  // solapen (con 4 personajes el slot es más angosto que el sprite).
  const targetRadius = Math.min(ENTITY * 0.8, targetSlot / 2);
  const targetHits: DropTargetHit[] = config.targets.map((t, i) => ({
    id: t.id,
    cx: targetSlot * i + targetSlot / 2,
    cy: targetY + ENTITY / 2,
    radius: targetRadius,
  }));

  // Draggables: fila superior.
  const dragY = height * 0.12;
  const dragSlot = width / config.draggables.length;

  const handleDrop = (
    draggable: DragMatchDraggableConfig,
    cx: number,
    cy: number,
  ) => {
    if (phase !== 'playing') return;
    const hit = resolveDrop(targetHits, cx, cy);
    if (hit === null) return; // no cayó en ningún target: no pasa nada, vuelve a su sitio
    if (!isMatchCorrect(hit, draggable.targetId)) {
      setPhase('lose');
      return;
    }
    // Calcular el veredicto fuera del updater para no invocar `setPhase` durante el
    // render (evita el warning de update-during-render en StrictMode).
    const next = new Set(matched).add(draggable.id);
    setMatched(next);
    if (next.size === config.draggables.length) setPhase('win');
  };

  const receivedItem = (targetId: string) =>
    config.draggables.some((d) => d.targetId === targetId);

  return (
    <View style={StyleSheet.absoluteFill}>
      {config.targets.map((t, i) => {
        const revealFrames =
          phase === 'win'
            ? receivedItem(t.id)
              ? t.winWithItemFrames
              : t.winFrames
            : phase === 'lose'
              ? t.loseFrames
              : undefined;
        return (
          <View
            key={t.id}
            style={[
              styles.entity,
              {
                left: targetSlot * i + (targetSlot - ENTITY) / 2,
                top: targetY,
              },
            ]}
          >
            {revealFrames ? (
              <FrameBounce
                frames={revealFrames}
                size={ENTITY}
                travelPx={phase === 'win' ? WIN_TRAVEL_PX : LOSE_TRAVEL_PX}
                travelMs={phase === 'win' ? WIN_REVEAL_MS : LOSE_REVEAL_MS}
                frameIntervalMs={phase === 'win' ? WIN_FRAME_MS : LOSE_FRAME_MS}
              />
            ) : (
              <VisualView visual={t.visual} size={ENTITY} />
            )}
          </View>
        );
      })}

      {phase === 'playing' &&
        config.draggables.map((d, i) =>
          matched.has(d.id) ? null : (
            <Draggable
              key={d.id}
              startX={dragSlot * i + (dragSlot - ENTITY) / 2}
              startY={dragY}
              size={ENTITY}
              onDrop={(cx, cy) => handleDrop(d, cx, cy)}
            >
              <VisualView visual={d.visual} size={ENTITY} />
            </Draggable>
          ),
        )}

      {phase === 'playing' && <RevealPreload targets={config.targets} />}
    </View>
  );
}

// Monta (invisibles) los sprites de victoria/derrota desde que arranca el juego:
// si se decodifican recién al cambiar de fase, Android muestra un parpadeo en
// blanco durante ese primer frame (ver FrameBounce para el parpadeo entre frames).
function RevealPreload({ targets }: { targets: DragMatchTargetConfig[] }) {
  const frames = targets.flatMap((t) => [
    ...(t.winFrames ?? []),
    ...(t.winWithItemFrames ?? []),
    ...(t.loseFrames ?? []),
  ]);
  return (
    <View style={styles.preload} pointerEvents="none">
      {frames.map(
        (v, i) =>
          v.source && (
            <Image key={i} source={v.source} style={styles.preloadImage} />
          ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  entity: {
    position: 'absolute',
    width: ENTITY,
    height: ENTITY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preload: { position: 'absolute', width: 0, height: 0, overflow: 'hidden' },
  preloadImage: { width: 1, height: 1 },
});
