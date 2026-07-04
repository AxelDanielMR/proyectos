import React, { useContext, useRef, useState } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { StageSizeContext } from '../primitives/MicrogameStage';
import { Draggable } from '../primitives/Draggable';
import { resolveDrop, isMatchCorrect, type DropTargetHit } from './dragMatch.logic';
import type { MicrogameResult, Visual } from '../../types';

export interface DragMatchTargetConfig {
  id: string;
  visual: Visual;
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

function VisualView({ visual, size }: { visual: Visual; size: number }) {
  if (visual.source) {
    return (
      <Image
        source={visual.source}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={(e) => console.warn('Image load error:', e)}
      />
    );
  }
  return <Text style={{ fontSize: size * 0.7 }}>{visual.emoji ?? '❓'}</Text>;
}

export function DragMatchGame({
  config,
  onResult,
}: {
  config: DragMatchConfig;
  onResult: (r: MicrogameResult) => void;
}) {
  const { width, height } = useContext(StageSizeContext);
  const resolvedRef = useRef(false);
  const [matched, setMatched] = useState<Set<string>>(new Set());

  const finish = (r: MicrogameResult) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResult(r);
  };

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

  const handleDrop = (draggable: DragMatchDraggableConfig, cx: number, cy: number) => {
    const hit = resolveDrop(targetHits, cx, cy);
    if (hit === null) return; // no cayó en ningún target: no pasa nada, vuelve a su sitio
    if (!isMatchCorrect(hit, draggable.targetId)) {
      finish('lose');
      return;
    }
    // Calcular el veredicto fuera del updater para no invocar `finish` durante el
    // render (evita el warning de update-during-render en StrictMode).
    const next = new Set(matched).add(draggable.id);
    setMatched(next);
    if (next.size === config.draggables.length) finish('win');
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {config.targets.map((t, i) => (
        <View
          key={t.id}
          style={[
            styles.entity,
            { left: targetSlot * i + (targetSlot - ENTITY) / 2, top: targetY },
          ]}
        >
          <VisualView visual={t.visual} size={ENTITY} />
        </View>
      ))}

      {config.draggables.map((d, i) =>
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
});
