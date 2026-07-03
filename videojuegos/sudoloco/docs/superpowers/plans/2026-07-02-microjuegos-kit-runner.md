# Microjuegos: Kit + Runner + 2 juegos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la infraestructura de microjuegos (registry liviano, selección pura, runner con stage rectangular, timer, veredicto y primitivas de gesto) y validarla de punta a punta con dos categorías reales: DragMatch (*Pon el sombrero*) y TapTiming (*Home run*).

**Architecture:** Tres capas en `src/features/microjuegos/`: (1) `registry.ts` + `selection.ts` + `types.ts` — metadatos livianos y selección/dificultad puras; (2) `kit/` — primitivas UI-thread (stage, timer, veredicto, draggable, tap-zone) y templates config-driven (DragMatch, TapTiming); (3) `games/` — un folder por juego (config + curva de dificultad propia + assets). El `runner.tsx` es el único que monta un juego a la vez, posee el timer (timeout = derrota) y reporta el resultado a la pantalla de Sudoloco, que aplica la recompensa. Toda condición de victoria/dificultad vive en funciones puras testeables; los componentes se validan corriendo la app (el repo no tiene setup de testing de componentes).

**Tech Stack:** Expo SDK 54 · RN 0.81 · React 19 · TS estricto (`noUncheckedIndexedAccess`) · Reanimated 4 + react-native-worklets · **react-native-gesture-handler (a instalar)** · Zustand · Jest (ts-jest, node) para lógica pura · i18next.

**Decisiones de comportamiento (respecto al código actual):**
- El overlay placeholder de la fase `microgame` en `screen.tsx` (que hoy otorga `time_boost` garantizado + reward al pulsar "Continuar") se reemplaza por el runner con juego real.
- **Ganar el microjuego** → se aplica la recompensa ya rodada (`microgameReward`). **Perder o timeout** → sin recompensa (`{ kind: 'none' }`, es decir, no se llama a `grantReward`). Esto le da apuestas al microjuego y coincide con el spec §10.
- La persistencia de "microjuegos descubiertos" y el menú del tab quedan **fuera de alcance** de este plan (llegan con el plan del menú). El runner recibe un `Set` de descubiertos; por ahora la pantalla pasa un set vacío.

**Assets:** El arte final (sprites) aún no existe. Los juegos usan **placeholders emoji** vía `assets.ts` de cada juego, que es el único punto de intercambio. Cuando llegue el arte, se cambia `assets.ts` a `require()` de sprite sheets sin tocar templates. El tipo `Visual` soporta ambos (`emoji` o `source`).

---

## Estructura de archivos

```
src/features/microjuegos/
  types.ts                         Microgame, MicrogameProps, MicrogameCategory, Visual
  registry.ts                      registerMicrogame / getMicrogame / listMicrogames
  selection.ts                     levelToDifficulty / pickMicrogame (puras)
  runner.tsx                       <MicrogameRunner> — stage + timer + veredicto
  register.ts                      importa y registra los juegos (1 línea por juego)
  index.ts                         barrel: side-effect register + re-exports
  kit/
    primitives/
      MicrogameStage.tsx           modal rectangular; provee tamaño px por contexto
      useMicrogameTimer.ts         countdown UI-thread; timeout → callback
      VerdictReaction.tsx          caras felices/enojadas + onDone
      Draggable.tsx                pan (gesture-handler) → onDrop(px,py)
      TapZone.tsx                  hit area absoluta → onTap
    templates/
      DragMatchGame.tsx            template drag-match (config-driven)
      dragMatch.logic.ts           resolveDrop / isMatchCorrect (pura)
      TapTimingGame.tsx            template tap-timing (config-driven)
      tapTiming.logic.ts           windowForDifficulty / isWithinWindow (pura)
  games/
    pon-el-sombrero/
      index.tsx                    Microgame → DragMatchGame
      config.ts                    buildConfig(difficulty, rng) (pura)
      assets.ts                    pool de personajes/sombreros (emoji placeholder)
    home-run/
      index.tsx                    Microgame → TapTimingGame
      config.ts                    buildConfig(difficulty) (pura)
      assets.ts                    visuales (emoji placeholder)
  __tests__/
    selection.test.ts
    dragMatch.logic.test.ts
    tapTiming.logic.test.ts
    pon-el-sombrero.config.test.ts
    home-run.config.test.ts

Modificados:
  app/_layout.tsx                  envolver en <GestureHandlerRootView>
  src/features/sudoloco/screen.tsx reemplazar overlay microgame por <MicrogameRunner>
  src/i18n/locales/es.json         claves microgames.*
  src/i18n/locales/en.json         claves microgames.*
  package.json                     + react-native-gesture-handler
```

---

## Task 1: Instalar gesture-handler y envolver la raíz

**Files:**
- Modify: `package.json` (vía expo install)
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Instalar la dependencia**

Run (PowerShell):
```powershell
npx expo install react-native-gesture-handler
```
Expected: agrega `react-native-gesture-handler` a `dependencies` en `package.json` con versión compatible con Expo SDK 54.

- [ ] **Step 2: Envolver la app en GestureHandlerRootView**

En `app/_layout.tsx`, importar y envolver el árbol dentro de `AppProviders`. Cambiar el `return` de `RootLayout`:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

```tsx
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <RootLayoutContent />
      </AppProviders>
    </GestureHandlerRootView>
  );
```

- [ ] **Step 3: Typecheck**

Run:
```powershell
npm run typecheck
```
Expected: sin errores.

- [ ] **Step 4: Commit**

```powershell
git add package.json package-lock.json app/_layout.tsx
git commit -m "feat(microjuegos): install gesture-handler and wrap root view"
```

---

## Task 2: Tipos base del sistema

**Files:**
- Create: `src/features/microjuegos/types.ts`

- [ ] **Step 1: Escribir los tipos**

```ts
import type React from 'react';
import type { Rng } from '@core/sudoku';

export type MicrogameCategory =
  | 'drag-match'
  | 'tap-timing'
  | 'tap-targets'
  | 'tap-spam'
  | 'dodge'
  | 'reveal'
  | 'flick'
  | 'sequence'
  | 'inverse';

export type MicrogameResult = 'win' | 'lose';

/** Descriptor visual de una entidad. Hoy usamos emoji; el arte final usará `source`. */
export interface Visual {
  emoji?: string;
  source?: number; // require() de imagen/sprite
  label?: string;
}

export interface MicrogameProps {
  /** 0..1; el juego lo interpreta con su propia curva. */
  difficulty: number;
  /** PRNG sembrado de la run — contenido determinista/testeable. */
  rng: Rng;
  /** El juego reporta victoria/derrota anticipada. El timeout lo maneja el runner. */
  onResult: (result: MicrogameResult) => void;
}

export interface Microgame {
  id: string;
  nameKey: string; // clave i18n, nunca literal
  category: MicrogameCategory;
  minLevel: number; // aparece a partir de este nivel de run
  durationMs: number; // límite; timeout = lose
  Component: React.FC<MicrogameProps>;
  thumbnail?: number; // require() para el menú (fase posterior)
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores. (`Rng` se exporta desde `@core/sudoku`.)

- [ ] **Step 3: Commit**

```powershell
git add src/features/microjuegos/types.ts
git commit -m "feat(microjuegos): add core types"
```

---

## Task 3: Registry

**Files:**
- Create: `src/features/microjuegos/registry.ts`
- Test: `src/features/microjuegos/__tests__/selection.test.ts` (se comparte con Task 4; el registry se ejercita indirectamente y con un test propio aquí)

- [ ] **Step 1: Escribir el test del registry**

Create `src/features/microjuegos/__tests__/registry.test.ts`:

```ts
import type { Microgame } from '../types';
import { registerMicrogame, getMicrogame, listMicrogames, _clearRegistry } from '../registry';

const fakeGame = (id: string): Microgame => ({
  id,
  nameKey: `microgames.${id}`,
  category: 'tap-timing',
  minLevel: 1,
  durationMs: 3000,
  Component: () => null,
});

describe('registry', () => {
  beforeEach(() => _clearRegistry());

  it('registers and retrieves a game by id', () => {
    const g = fakeGame('a');
    registerMicrogame(g);
    expect(getMicrogame('a')).toBe(g);
  });

  it('lists all registered games', () => {
    registerMicrogame(fakeGame('a'));
    registerMicrogame(fakeGame('b'));
    expect(listMicrogames().map((g) => g.id).sort()).toEqual(['a', 'b']);
  });

  it('throws on duplicate id', () => {
    registerMicrogame(fakeGame('a'));
    expect(() => registerMicrogame(fakeGame('a'))).toThrow(/already registered/);
  });
});
```

- [ ] **Step 2: Correr el test — debe fallar**

Run: `npm test -- registry`
Expected: FAIL — `Cannot find module '../registry'`.

- [ ] **Step 3: Implementar el registry**

Create `src/features/microjuegos/registry.ts`:

```ts
import type { Microgame } from './types';

const registry = new Map<string, Microgame>();

export function registerMicrogame(game: Microgame): void {
  if (registry.has(game.id)) {
    throw new Error(`Microgame already registered: ${game.id}`);
  }
  registry.set(game.id, game);
}

export function getMicrogame(id: string): Microgame | undefined {
  return registry.get(id);
}

export function listMicrogames(): Microgame[] {
  return [...registry.values()];
}

/** Solo para tests. */
export function _clearRegistry(): void {
  registry.clear();
}
```

- [ ] **Step 4: Correr el test — debe pasar**

Run: `npm test -- registry`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```powershell
git add src/features/microjuegos/registry.ts src/features/microjuegos/__tests__/registry.test.ts
git commit -m "feat(microjuegos): add lightweight registry"
```

---

## Task 4: Selección y curva de dificultad (puras)

**Files:**
- Create: `src/features/microjuegos/selection.ts`
- Test: `src/features/microjuegos/__tests__/selection.test.ts`

- [ ] **Step 1: Escribir el test**

Create `src/features/microjuegos/__tests__/selection.test.ts`:

```ts
import type { Microgame } from '../types';
import { levelToDifficulty, pickMicrogame } from '../selection';

const game = (id: string, minLevel: number): Microgame => ({
  id,
  nameKey: `microgames.${id}`,
  category: 'tap-timing',
  minLevel,
  durationMs: 3000,
  Component: () => null,
});

// rng determinista que devuelve valores de una cola.
const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe('levelToDifficulty', () => {
  it('is 0 at level 1 and clamps to [0,1]', () => {
    expect(levelToDifficulty(1)).toBe(0);
    expect(levelToDifficulty(0)).toBe(0);
    expect(levelToDifficulty(100)).toBe(1);
  });

  it('grows monotonically', () => {
    expect(levelToDifficulty(5)).toBeGreaterThan(levelToDifficulty(2));
    expect(levelToDifficulty(20)).toBeLessThanOrEqual(1);
  });
});

describe('pickMicrogame', () => {
  const games = [game('a', 1), game('b', 1), game('c', 5)];

  it('excludes games above the current level', () => {
    const picked = pickMicrogame(games, 3, new Set(), seq([0.99]));
    expect(picked?.id).not.toBe('c');
  });

  it('prefers undiscovered games', () => {
    // 'a' y 'b' descubiertos → debe elegir 'c' (nivel 5, no descubierto)
    const picked = pickMicrogame(games, 10, new Set(['a', 'b']), seq([0]));
    expect(picked?.id).toBe('c');
  });

  it('falls back to all eligible when everything is discovered', () => {
    const picked = pickMicrogame(games, 10, new Set(['a', 'b', 'c']), seq([0]));
    expect(picked).not.toBeNull();
  });

  it('returns null when none are eligible', () => {
    expect(pickMicrogame(games, 0, new Set(), seq([0]))).toBeNull();
  });

  it('is deterministic for a given rng', () => {
    const p1 = pickMicrogame(games, 10, new Set(), seq([0.5]));
    const p2 = pickMicrogame(games, 10, new Set(), seq([0.5]));
    expect(p1?.id).toBe(p2?.id);
  });
});
```

- [ ] **Step 2: Correr el test — debe fallar**

Run: `npm test -- selection`
Expected: FAIL — `Cannot find module '../selection'`.

- [ ] **Step 3: Implementar**

Create `src/features/microjuegos/selection.ts`:

```ts
import type { Rng } from '@core/sudoku';
import type { Microgame } from './types';

/** Mapea el nivel de la run a dificultad normalizada 0..1 (satura hacia nivel 20). */
export function levelToDifficulty(level: number): number {
  const d = (level - 1) / 19;
  return Math.max(0, Math.min(1, d));
}

/**
 * Elige un microjuego elegible (minLevel <= level), prefiriendo los no descubiertos.
 * Determinista dado `rng`. Devuelve null si no hay ninguno elegible.
 */
export function pickMicrogame(
  games: Microgame[],
  level: number,
  discoveredIds: ReadonlySet<string>,
  rng: Rng,
): Microgame | null {
  const eligible = games.filter((g) => g.minLevel <= level);
  if (eligible.length === 0) return null;

  const undiscovered = eligible.filter((g) => !discoveredIds.has(g.id));
  const pool = undiscovered.length > 0 ? undiscovered : eligible;

  const idx = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
  return pool[idx] ?? null;
}
```

- [ ] **Step 4: Correr el test — debe pasar**

Run: `npm test -- selection`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/microjuegos/selection.ts src/features/microjuegos/__tests__/selection.test.ts
git commit -m "feat(microjuegos): add pure selection and difficulty curve"
```

---

## Task 5: Primitiva useMicrogameTimer

**Files:**
- Create: `src/features/microjuegos/kit/primitives/useMicrogameTimer.ts`

Cuenta regresiva en el UI thread con Reanimated. Devuelve un `SharedValue<number>` (1 → 0) para pintar una barra, y dispara `onTimeout` una vez al llegar a 0. `active=false` no arranca.

- [ ] **Step 1: Implementar**

Create `src/features/microjuegos/kit/primitives/useMicrogameTimer.ts`:

```ts
import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withTiming,
  cancelAnimation,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Countdown UI-thread. `progress` va de 1 (lleno) a 0 (agotado) durante `durationMs`.
 * Al llegar a 0 dispara `onTimeout` exactamente una vez. Si `active` es false, no arranca.
 */
export function useMicrogameTimer(
  durationMs: number,
  onTimeout: () => void,
  active: boolean,
): SharedValue<number> {
  const progress = useSharedValue(1);
  const cbRef = useRef(onTimeout);
  cbRef.current = onTimeout;

  const fire = () => cbRef.current();

  useEffect(() => {
    if (!active) return;
    progress.value = 1;
    progress.value = withTiming(0, { duration: durationMs }, (finished) => {
      'worklet';
      if (finished) runOnJS(fire)();
    });
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, durationMs]);

  return progress;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add src/features/microjuegos/kit/primitives/useMicrogameTimer.ts
git commit -m "feat(microjuegos): add UI-thread countdown timer hook"
```

---

## Task 6: Primitiva MicrogameStage

**Files:**
- Create: `src/features/microjuegos/kit/primitives/MicrogameStage.tsx`

Modal rectangular centrado, proporción fija (3:4), recorta contenido. Mide su tamaño real y lo provee en px por contexto para que templates y draggables posicionen entidades.

- [ ] **Step 1: Implementar**

Create `src/features/microjuegos/kit/primitives/MicrogameStage.tsx`:

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add src/features/microjuegos/kit/primitives/MicrogameStage.tsx
git commit -m "feat(microjuegos): add rectangular stage primitive"
```

---

## Task 7: Primitiva VerdictReaction

**Files:**
- Create: `src/features/microjuegos/kit/primitives/VerdictReaction.tsx`

Overlay breve: caras felices (win) o enojadas (lose), animado con Reanimated; llama `onDone` tras ~900ms.

- [ ] **Step 1: Implementar**

Create `src/features/microjuegos/kit/primitives/VerdictReaction.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import type { MicrogameResult } from '../../types';

export function VerdictReaction({
  result,
  onDone,
}: {
  result: MicrogameResult;
  onDone: () => void;
}) {
  const scale = useSharedValue(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const fire = () => doneRef.current();

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1, { damping: 8 }),
      withDelay(
        700,
        withTiming(1, { duration: 1 }, (finished) => {
          'worklet';
          if (finished) runOnJS(fire)();
        }),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const face = result === 'win' ? '😄🎉😄' : '😠😞😠';

  return (
    <Animated.View style={[styles.overlay, style]} pointerEvents="none">
      <Text style={styles.face}>{face}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: { fontSize: 56 },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add src/features/microjuegos/kit/primitives/VerdictReaction.tsx
git commit -m "feat(microjuegos): add verdict reaction primitive"
```

---

## Task 8: Primitivas Draggable y TapZone

**Files:**
- Create: `src/features/microjuegos/kit/primitives/Draggable.tsx`
- Create: `src/features/microjuegos/kit/primitives/TapZone.tsx`

- [ ] **Step 1: Implementar Draggable**

Create `src/features/microjuegos/kit/primitives/Draggable.tsx`:

```tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

/**
 * Sprite arrastrable posicionado en (startX, startY) dentro del stage.
 * Al soltar, reporta el centro absoluto (px del stage) vía `onDrop` y vuelve a su origen.
 */
export function Draggable({
  startX,
  startY,
  size,
  onDrop,
  children,
}: {
  startX: number;
  startY: number;
  size: number;
  onDrop: (centerX: number, centerY: number) => void;
  children: React.ReactNode;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const pan = Gesture.Pan()
    .onChange((e) => {
      tx.value += e.changeX;
      ty.value += e.changeY;
    })
    .onEnd(() => {
      const cx = startX + tx.value + size / 2;
      const cy = startY + ty.value + size / 2;
      runOnJS(onDrop)(cx, cy);
      tx.value = withSpring(0);
      ty.value = withSpring(0);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.base,
          { left: startX, top: startY, width: size, height: size },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 2: Implementar TapZone**

Create `src/features/microjuegos/kit/primitives/TapZone.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

/** Área táctil absoluta dentro del stage. */
export function TapZone({
  x,
  y,
  width,
  height,
  onTap,
  disabled,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  onTap: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onTap}
      style={[styles.base, { left: x, top: y, width, height }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```powershell
git add src/features/microjuegos/kit/primitives/Draggable.tsx src/features/microjuegos/kit/primitives/TapZone.tsx
git commit -m "feat(microjuegos): add draggable and tap-zone primitives"
```

---

## Task 9: Lógica pura de DragMatch

**Files:**
- Create: `src/features/microjuegos/kit/templates/dragMatch.logic.ts`
- Test: `src/features/microjuegos/__tests__/dragMatch.logic.test.ts`

- [ ] **Step 1: Escribir el test**

Create `src/features/microjuegos/__tests__/dragMatch.logic.test.ts`:

```ts
import { resolveDrop, isMatchCorrect, type DropTargetHit } from '../kit/templates/dragMatch.logic';

const targets: DropTargetHit[] = [
  { id: 'ing', cx: 50, cy: 300, radius: 40 },
  { id: 'fire', cx: 150, cy: 300, radius: 40 },
];

describe('resolveDrop', () => {
  it('returns the target id when dropped within its radius', () => {
    expect(resolveDrop(targets, 55, 305)).toBe('ing');
  });

  it('returns null when dropped outside every target', () => {
    expect(resolveDrop(targets, 300, 300)).toBeNull();
  });

  it('returns the target whose circle contains the point', () => {
    expect(resolveDrop(targets, 148, 300)).toBe('fire');
  });
});

describe('isMatchCorrect', () => {
  it('is true only when dropped target equals expected', () => {
    expect(isMatchCorrect('ing', 'ing')).toBe(true);
    expect(isMatchCorrect('fire', 'ing')).toBe(false);
    expect(isMatchCorrect(null, 'ing')).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test — debe fallar**

Run: `npm test -- dragMatch`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar**

Create `src/features/microjuegos/kit/templates/dragMatch.logic.ts`:

```ts
export interface DropTargetHit {
  id: string;
  cx: number;
  cy: number;
  radius: number;
}

/** Devuelve el id del primer target cuyo círculo contiene el punto, o null. */
export function resolveDrop(
  targets: DropTargetHit[],
  dropX: number,
  dropY: number,
): string | null {
  for (const t of targets) {
    const dx = dropX - t.cx;
    const dy = dropY - t.cy;
    if (dx * dx + dy * dy <= t.radius * t.radius) return t.id;
  }
  return null;
}

export function isMatchCorrect(droppedTargetId: string | null, expectedId: string): boolean {
  return droppedTargetId === expectedId;
}
```

- [ ] **Step 4: Correr el test — debe pasar**

Run: `npm test -- dragMatch`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/microjuegos/kit/templates/dragMatch.logic.ts src/features/microjuegos/__tests__/dragMatch.logic.test.ts
git commit -m "feat(microjuegos): add pure drag-match resolution logic"
```

---

## Task 10: Template DragMatchGame

**Files:**
- Create: `src/features/microjuegos/kit/templates/DragMatchGame.tsx`

Template abierto y agnóstico: recibe `config` (personajes = targets, sombreros = draggables con `targetId`) y `onResult`. Posiciona targets en la fila inferior y draggables en la superior usando el tamaño del stage. Al soltar un sombrero: si cae en el target correcto, lo cuenta; si cae en uno incorrecto → derrota inmediata; al colocar todos correctamente → victoria.

- [ ] **Step 1: Implementar**

Create `src/features/microjuegos/kit/templates/DragMatchGame.tsx`:

```tsx
import React, { useContext, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  // Placeholder: emoji. El arte final usará <Image source={visual.source} />.
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
  const targetHits: DropTargetHit[] = config.targets.map((t, i) => ({
    id: t.id,
    cx: targetSlot * i + targetSlot / 2,
    cy: targetY + ENTITY / 2,
    radius: ENTITY * 0.8,
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
    setMatched((prev) => {
      const next = new Set(prev).add(draggable.id);
      if (next.size === config.draggables.length) finish('win');
      return next;
    });
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add src/features/microjuegos/kit/templates/DragMatchGame.tsx
git commit -m "feat(microjuegos): add DragMatch template"
```

---

## Task 11: Lógica pura de TapTiming

**Files:**
- Create: `src/features/microjuegos/kit/templates/tapTiming.logic.ts`
- Test: `src/features/microjuegos/__tests__/tapTiming.logic.test.ts`

- [ ] **Step 1: Escribir el test**

Create `src/features/microjuegos/__tests__/tapTiming.logic.test.ts`:

```ts
import { windowForDifficulty, isWithinWindow } from '../kit/templates/tapTiming.logic';

describe('windowForDifficulty', () => {
  it('produces a narrower window as difficulty rises', () => {
    const easy = windowForDifficulty(0);
    const hard = windowForDifficulty(1);
    const easyWidth = easy.end - easy.start;
    const hardWidth = hard.end - hard.start;
    expect(hardWidth).toBeLessThan(easyWidth);
    expect(hardWidth).toBeGreaterThan(0);
  });

  it('keeps the window inside [0,1]', () => {
    for (const d of [0, 0.5, 1]) {
      const w = windowForDifficulty(d);
      expect(w.start).toBeGreaterThanOrEqual(0);
      expect(w.end).toBeLessThanOrEqual(1);
      expect(w.start).toBeLessThan(w.end);
    }
  });
});

describe('isWithinWindow', () => {
  it('is true inside [start,end] and false outside', () => {
    expect(isWithinWindow(0.7, 0.6, 0.8)).toBe(true);
    expect(isWithinWindow(0.6, 0.6, 0.8)).toBe(true);
    expect(isWithinWindow(0.5, 0.6, 0.8)).toBe(false);
    expect(isWithinWindow(0.9, 0.6, 0.8)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test — debe fallar**

Run: `npm test -- tapTiming`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar**

Create `src/features/microjuegos/kit/templates/tapTiming.logic.ts`:

```ts
export interface TimingWindow {
  start: number;
  end: number;
}

/**
 * Ventana de acierto sobre la línea de tiempo 0..1 del móvil. Más difícil = más angosta.
 * Centrada en 0.7 (el móvil "llega" al bate hacia el final del recorrido).
 */
export function windowForDifficulty(difficulty: number): TimingWindow {
  const d = Math.max(0, Math.min(1, difficulty));
  const half = 0.18 - 0.12 * d; // 0.18 (fácil) → 0.06 (difícil)
  const center = 0.7;
  return { start: center - half, end: center + half };
}

export function isWithinWindow(t: number, start: number, end: number): boolean {
  return t >= start && t <= end;
}
```

- [ ] **Step 4: Correr el test — debe pasar**

Run: `npm test -- tapTiming`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/microjuegos/kit/templates/tapTiming.logic.ts src/features/microjuegos/__tests__/tapTiming.logic.test.ts
git commit -m "feat(microjuegos): add pure tap-timing window logic"
```

---

## Task 12: Template TapTimingGame

**Files:**
- Create: `src/features/microjuegos/kit/templates/TapTimingGame.tsx`

El móvil (pelota) se anima 0→1 sobre el ancho del stage en `travelMs`. Un `TapZone` sobre el bateador (derecha). Al tocar, se lee la posición actual (shared value) y se decide win/lose con `isWithinWindow`. Si el recorrido termina sin tap → derrota.

- [ ] **Step 1: Implementar**

Create `src/features/microjuegos/kit/templates/TapTimingGame.tsx`:

```tsx
import React, { useContext, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { StageSizeContext } from '../primitives/MicrogameStage';
import { TapZone } from '../primitives/TapZone';
import { isWithinWindow, type TimingWindow } from './tapTiming.logic';
import type { MicrogameResult, Visual } from '../../types';

export interface TapTimingConfig {
  window: TimingWindow;
  travelMs: number;
  ball: Visual;
  batter: Visual;
}

const BALL = 48;

export function TapTimingGame({
  config,
  onResult,
}: {
  config: TapTimingConfig;
  onResult: (r: MicrogameResult) => void;
}) {
  const { width, height } = useContext(StageSizeContext);
  const progress = useSharedValue(0);
  const resolvedRef = useRef(false);

  const finish = (r: MicrogameResult) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    cancelAnimation(progress);
    onResult(r);
  };

  const miss = () => finish('lose');

  useEffect(() => {
    progress.value = withTiming(1, { duration: config.travelMs }, (finished) => {
      'worklet';
      if (finished) runOnJS(miss)();
    });
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTap = () => {
    const t = progress.value;
    finish(isWithinWindow(t, config.window.start, config.window.end) ? 'win' : 'lose');
  };

  const ballStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (width - BALL) }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ball, { top: height * 0.45 }, ballStyle]}>
        <Text style={styles.ballText}>{config.ball.emoji ?? '⚾'}</Text>
      </Animated.View>

      <TapZone
        x={width * 0.58}
        y={height * 0.25}
        width={width * 0.42}
        height={height * 0.5}
        onTap={onTap}
      >
        <Text style={styles.batter}>{config.batter.emoji ?? '🏏'}</Text>
      </TapZone>
    </View>
  );
}

const styles = StyleSheet.create({
  ball: { position: 'absolute', width: BALL, height: BALL, alignItems: 'center', justifyContent: 'center' },
  ballText: { fontSize: 36 },
  batter: { fontSize: 72 },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add src/features/microjuegos/kit/templates/TapTimingGame.tsx
git commit -m "feat(microjuegos): add TapTiming template"
```

---

## Task 13: Juego "Pon el sombrero" (DragMatch)

**Files:**
- Create: `src/features/microjuegos/games/pon-el-sombrero/assets.ts`
- Create: `src/features/microjuegos/games/pon-el-sombrero/config.ts`
- Create: `src/features/microjuegos/games/pon-el-sombrero/index.tsx`
- Test: `src/features/microjuegos/__tests__/pon-el-sombrero.config.test.ts`

- [ ] **Step 1: Escribir assets (placeholder emoji)**

Create `src/features/microjuegos/games/pon-el-sombrero/assets.ts`:

```ts
import type { Visual } from '../../types';

export interface CharacterAsset {
  id: string;
  character: Visual; // el personaje sin sombrero
  hat: Visual; // el sombrero que le pertenece
}

/** Pool de 5 profesionistas + su sombrero. Placeholder emoji hasta tener arte. */
export const CHARACTERS: CharacterAsset[] = [
  { id: 'ingeniero', character: { emoji: '👷', label: 'Ingeniero' }, hat: { emoji: '⛑️' } },
  { id: 'bombero', character: { emoji: '🧑‍🚒', label: 'Bombero' }, hat: { emoji: '🎩' } },
  { id: 'vaquero', character: { emoji: '🤠', label: 'Vaquero' }, hat: { emoji: '👒' } },
  { id: 'pirata', character: { emoji: '🏴‍☠️', label: 'Pirata' }, hat: { emoji: '🎓' } },
  { id: 'alcalde', character: { emoji: '🧑‍💼', label: 'Alcalde' }, hat: { emoji: '👑' } },
];
```

> Nota: los emoji de sombrero son placeholders arbitrarios; lo que importa es la relación id↔sombrero. Se reemplazan por sprites reales cambiando solo este archivo.

- [ ] **Step 2: Escribir el test de config**

Create `src/features/microjuegos/__tests__/pon-el-sombrero.config.test.ts`:

```ts
import { buildConfig } from '../games/pon-el-sombrero/config';

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe('pon-el-sombrero buildConfig', () => {
  it('has 3 characters and 1 hat at difficulty 0', () => {
    const cfg = buildConfig(0, seq([0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(cfg.targets).toHaveLength(3);
    expect(cfg.draggables).toHaveLength(1);
  });

  it('has 4 characters and 2 hats at difficulty 1', () => {
    const cfg = buildConfig(1, seq([0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(cfg.targets).toHaveLength(4);
    expect(cfg.draggables).toHaveLength(2);
  });

  it('every hat belongs to a character present on the board', () => {
    const cfg = buildConfig(1, seq([0.7, 0.1, 0.9, 0.3, 0.5]));
    const targetIds = new Set(cfg.targets.map((t) => t.id));
    for (const d of cfg.draggables) {
      expect(targetIds.has(d.targetId)).toBe(true);
    }
  });

  it('is deterministic for a given rng sequence', () => {
    const a = buildConfig(0.5, seq([0.2, 0.8, 0.4, 0.1, 0.6]));
    const b = buildConfig(0.5, seq([0.2, 0.8, 0.4, 0.1, 0.6]));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 3: Correr el test — debe fallar**

Run: `npm test -- pon-el-sombrero`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 4: Implementar config (pura)**

Create `src/features/microjuegos/games/pon-el-sombrero/config.ts`:

```ts
import type { Rng } from '@core/sudoku';
import type { DragMatchConfig } from '../../kit/templates/DragMatchGame';
import { CHARACTERS, type CharacterAsset } from './assets';

/** Baraja una copia con Fisher-Yates usando el rng dado. */
function shuffle<T>(items: T[], rng: Rng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = arr[i];
    const b = arr[j];
    if (a !== undefined && b !== undefined) {
      arr[i] = b;
      arr[j] = a;
    }
  }
  return arr;
}

/**
 * difficulty 0 → 3 personajes, 1 sombrero. difficulty 1 → 4 personajes, 2 sombreros.
 * (Curva propia del juego; se balancea después.)
 */
export function buildConfig(difficulty: number, rng: Rng): DragMatchConfig {
  const d = Math.max(0, Math.min(1, difficulty));
  const characterCount = d >= 0.5 ? 4 : 3;
  const hatCount = d >= 0.75 ? 2 : 1;

  const chosen: CharacterAsset[] = shuffle(CHARACTERS, rng).slice(0, characterCount);
  const withHats: CharacterAsset[] = shuffle(chosen, rng).slice(0, hatCount);

  return {
    targets: chosen.map((c) => ({ id: c.id, visual: c.character })),
    draggables: withHats.map((c) => ({ id: `hat-${c.id}`, targetId: c.id, visual: c.hat })),
  };
}
```

- [ ] **Step 5: Correr el test — debe pasar**

Run: `npm test -- pon-el-sombrero`
Expected: PASS.

- [ ] **Step 6: Implementar el componente del juego**

Create `src/features/microjuegos/games/pon-el-sombrero/index.tsx`:

```tsx
import React, { useMemo } from 'react';
import { DragMatchGame } from '../../kit/templates/DragMatchGame';
import type { Microgame, MicrogameProps } from '../../types';
import { buildConfig } from './config';

const PonElSombrero: React.FC<MicrogameProps> = ({ difficulty, rng, onResult }) => {
  const config = useMemo(() => buildConfig(difficulty, rng), []); // eslint-disable-line react-hooks/exhaustive-deps
  return <DragMatchGame config={config} onResult={onResult} />;
};

export const ponElSombrero: Microgame = {
  id: 'pon-el-sombrero',
  nameKey: 'microgames.ponElSombrero',
  category: 'drag-match',
  minLevel: 1,
  durationMs: 6000,
  Component: PonElSombrero,
};
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 8: Commit**

```powershell
git add src/features/microjuegos/games/pon-el-sombrero src/features/microjuegos/__tests__/pon-el-sombrero.config.test.ts
git commit -m "feat(microjuegos): add 'pon el sombrero' drag-match game"
```

---

## Task 14: Juego "Home run" (TapTiming)

**Files:**
- Create: `src/features/microjuegos/games/home-run/assets.ts`
- Create: `src/features/microjuegos/games/home-run/config.ts`
- Create: `src/features/microjuegos/games/home-run/index.tsx`
- Test: `src/features/microjuegos/__tests__/home-run.config.test.ts`

- [ ] **Step 1: Escribir assets**

Create `src/features/microjuegos/games/home-run/assets.ts`:

```ts
import type { Visual } from '../../types';

export const BALL: Visual = { emoji: '⚾' };
export const BATTER: Visual = { emoji: '🏏', label: 'Bateador' };
```

- [ ] **Step 2: Escribir el test de config**

Create `src/features/microjuegos/__tests__/home-run.config.test.ts`:

```ts
import { buildConfig } from '../games/home-run/config';

describe('home-run buildConfig', () => {
  it('narrows the window and speeds up the ball as difficulty rises', () => {
    const easy = buildConfig(0);
    const hard = buildConfig(1);
    expect(hard.window.end - hard.window.start).toBeLessThan(easy.window.end - easy.window.start);
    expect(hard.travelMs).toBeLessThan(easy.travelMs);
  });

  it('keeps travelMs positive', () => {
    expect(buildConfig(1).travelMs).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Correr el test — debe fallar**

Run: `npm test -- home-run`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 4: Implementar config (pura)**

Create `src/features/microjuegos/games/home-run/config.ts`:

```ts
import type { TapTimingConfig } from '../../kit/templates/TapTimingGame';
import { windowForDifficulty } from '../../kit/templates/tapTiming.logic';
import { BALL, BATTER } from './assets';

/** difficulty 0 → lento y ventana ancha; difficulty 1 → rápido y ventana angosta. */
export function buildConfig(difficulty: number): TapTimingConfig {
  const d = Math.max(0, Math.min(1, difficulty));
  return {
    window: windowForDifficulty(d),
    travelMs: Math.round(1900 - 800 * d), // 1900ms → 1100ms
    ball: BALL,
    batter: BATTER,
  };
}
```

- [ ] **Step 5: Correr el test — debe pasar**

Run: `npm test -- home-run`
Expected: PASS.

- [ ] **Step 6: Implementar el componente del juego**

Create `src/features/microjuegos/games/home-run/index.tsx`:

```tsx
import React, { useMemo } from 'react';
import { TapTimingGame } from '../../kit/templates/TapTimingGame';
import type { Microgame, MicrogameProps } from '../../types';
import { buildConfig } from './config';

const HomeRun: React.FC<MicrogameProps> = ({ difficulty, onResult }) => {
  const config = useMemo(() => buildConfig(difficulty), [difficulty]);
  return <TapTimingGame config={config} onResult={onResult} />;
};

export const homeRun: Microgame = {
  id: 'home-run',
  nameKey: 'microgames.homeRun',
  category: 'tap-timing',
  minLevel: 1,
  durationMs: 4000,
  Component: HomeRun,
};
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 8: Commit**

```powershell
git add src/features/microjuegos/games/home-run src/features/microjuegos/__tests__/home-run.config.test.ts
git commit -m "feat(microjuegos): add 'home run' tap-timing game"
```

---

## Task 15: Runner

**Files:**
- Create: `src/features/microjuegos/runner.tsx`

Overlay único. Monta el `MicrogameStage`, dentro: la barra de tiempo (animada con `useMicrogameTimer`), el `Component` del juego, y el `VerdictReaction` al resolver. El runner es el único dueño del timer: al agotarse → resultado `'lose'`. Al resolver (win/lose/timeout) muestra el veredicto y luego llama `onFinish(result)`.

- [ ] **Step 1: Implementar**

Create `src/features/microjuegos/runner.tsx`:

```tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { MicrogameStage } from './kit/primitives/MicrogameStage';
import { useMicrogameTimer } from './kit/primitives/useMicrogameTimer';
import { VerdictReaction } from './kit/primitives/VerdictReaction';
import type { Microgame, MicrogameResult } from './types';
import type { Rng } from '@core/sudoku';

export function MicrogameRunner({
  game,
  difficulty,
  rng,
  onFinish,
}: {
  game: Microgame;
  difficulty: number;
  rng: Rng;
  onFinish: (result: MicrogameResult) => void;
}) {
  const [result, setResult] = useState<MicrogameResult | null>(null);

  const handleResult = (r: MicrogameResult) => {
    setResult((prev) => prev ?? r); // primer resultado gana
  };

  // El timer corre mientras no haya resultado; al agotarse es derrota.
  const progress = useMicrogameTimer(game.durationMs, () => handleResult('lose'), result === null);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const Game = game.Component;

  return (
    <MicrogameStage>
      <View style={styles.timerTrack} pointerEvents="none">
        <Animated.View style={[styles.timerFill, barStyle]} />
      </View>

      <Game difficulty={difficulty} rng={rng} onResult={handleResult} />

      {result !== null && (
        <VerdictReaction result={result} onDone={() => onFinish(result)} />
      )}
    </MicrogameStage>
  );
}

const styles = StyleSheet.create({
  timerTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.12)',
    zIndex: 5,
  },
  timerFill: { height: 8, backgroundColor: '#ef4444' },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add src/features/microjuegos/runner.tsx
git commit -m "feat(microjuegos): add runner (stage + timer + verdict)"
```

---

## Task 16: Registro de juegos y barrel export

**Files:**
- Create: `src/features/microjuegos/register.ts`
- Create: `src/features/microjuegos/index.ts`

- [ ] **Step 1: Escribir el registro (1 línea por juego)**

Create `src/features/microjuegos/register.ts`:

```ts
import { registerMicrogame } from './registry';
import { ponElSombrero } from './games/pon-el-sombrero';
import { homeRun } from './games/home-run';

// Agregar un microjuego = importar arriba + una línea aquí.
registerMicrogame(ponElSombrero);
registerMicrogame(homeRun);
```

- [ ] **Step 2: Escribir el barrel**

Create `src/features/microjuegos/index.ts`:

```ts
import './register'; // side-effect: registra todos los juegos al importar el feature

export { MicrogameRunner } from './runner';
export { listMicrogames, getMicrogame } from './registry';
export { pickMicrogame, levelToDifficulty } from './selection';
export type { Microgame, MicrogameResult, MicrogameCategory } from './types';
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Verificar que el registro corre (test)**

Create `src/features/microjuegos/__tests__/register.test.ts`:

```ts
import { listMicrogames } from '../index';

describe('microjuegos registration', () => {
  it('registers the two initial games', () => {
    const ids = listMicrogames().map((g) => g.id).sort();
    expect(ids).toEqual(['home-run', 'pon-el-sombrero']);
  });
});
```

> Nota: este test importa `../index`, que arrastra `runner.tsx` y componentes RN. El proyecto `unit` de Jest solo matchea `*.test.ts` en entorno `node`; los componentes no se ejecutan (solo se importan tipos/objetos), pero `runner.tsx` importa `react-native-reanimated`. Si la importación falla en node, mover este test a excluir el runner: importar directamente `../register` y `../registry` en su lugar:
>
> ```ts
> import '../register';
> import { listMicrogames } from '../registry';
> ```
>
> Usa esta segunda forma si la primera rompe por deps de RN en node.

- [ ] **Step 5: Correr el test**

Run: `npm test -- register`
Expected: PASS (usando la forma que funcione en node según la nota).

- [ ] **Step 6: Commit**

```powershell
git add src/features/microjuegos/register.ts src/features/microjuegos/index.ts src/features/microjuegos/__tests__/register.test.ts
git commit -m "feat(microjuegos): register initial games and add barrel export"
```

---

## Task 17: Claves i18n

**Files:**
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Agregar claves en español**

En `src/i18n/locales/es.json`, agregar un bloque `microgames` al nivel raíz (después de `profile`):

```json
  "microgames": {
    "title": "¡Microjuego!",
    "ready": "¿Listo?",
    "ponElSombrero": "Pon el sombrero",
    "homeRun": "Home run"
  }
```

(Recuerda la coma tras el objeto `profile` anterior.)

- [ ] **Step 2: Agregar claves en inglés**

En `src/i18n/locales/en.json`, el bloque equivalente:

```json
  "microgames": {
    "title": "Microgame!",
    "ready": "Ready?",
    "ponElSombrero": "Put the hat on",
    "homeRun": "Home run"
  }
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sin errores (JSON válido).

- [ ] **Step 4: Commit**

```powershell
git add src/i18n/locales/es.json src/i18n/locales/en.json
git commit -m "feat(microjuegos): add i18n keys"
```

---

## Task 18: Integrar el runner en la pantalla de Sudoloco

**Files:**
- Modify: `src/features/sudoloco/screen.tsx`

Reemplaza el overlay placeholder de la fase `microgame` (líneas ~270-288) por el `MicrogameRunner`. La selección del juego usa `pickMicrogame` con el `rng` de la run; el resultado aplica la recompensa ya rodada (`microgameReward`) solo si se gana.

- [ ] **Step 1: Añadir imports**

En `src/features/sudoloco/screen.tsx`, junto a los imports existentes:

```tsx
import { MicrogameRunner, listMicrogames, pickMicrogame, levelToDifficulty } from '@features/microjuegos';
import type { Microgame } from '@features/microjuegos';
```

- [ ] **Step 2: Seleccionar el juego al entrar en fase microgame**

Debajo del efecto que setea `microgameReward` (línea ~137-143), agregar la selección del juego:

```tsx
  const [activeMicrogame, setActiveMicrogame] = useState<Microgame | null>(null);
  useEffect(() => {
    if (phase === 'microgame' && rng) {
      // discoveredIds: la persistencia de descubiertos llega con el menú (fuera de alcance).
      setActiveMicrogame(pickMicrogame(listMicrogames(), level, new Set(), rng));
    } else {
      setActiveMicrogame(null);
    }
  }, [phase, rng, level]);
```

- [ ] **Step 3: Reemplazar el overlay de microgame**

Sustituir el bloque `{phase === 'microgame' && ( ... )}` (líneas ~270-288) por:

```tsx
      {phase === 'microgame' && activeMicrogame && rng && (
        <MicrogameRunner
          game={activeMicrogame}
          difficulty={levelToDifficulty(level)}
          rng={rng}
          onFinish={(result) => {
            if (result === 'win' && microgameReward) {
              grantReward(microgameReward);
            }
            exitMicrogame();
          }}
        />
      )}
```

> Cambio de comportamiento intencional: ya no se otorga `time_boost` garantizado. Ganar el microjuego aplica `microgameReward`; perder o timeout no otorga nada. Coincide con el spec §10.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 6: Correr toda la suite de tests**

Run: `npm test`
Expected: todos los tests pasan (incluidos los nuevos de microjuegos y los existentes).

- [ ] **Step 7: Commit**

```powershell
git add src/features/sudoloco/screen.tsx
git commit -m "feat(microjuegos): wire runner into Sudoloco box-complete flow"
```

---

## Task 19: Validación end-to-end en el emulador

**Files:** ninguno (validación manual)

- [ ] **Step 1: Lanzar la app**

Run (PowerShell):
```powershell
npm run android
```

- [ ] **Step 2: Checklist de validación en Sudoloco**

Iniciar una run de Sudoloco y completar una caja para disparar un microjuego. Verificar:

- [ ] Aparece el modal rectangular (stage) centrado con el backdrop oscuro; el tablero queda detrás sin recibir toques.
- [ ] La barra de tiempo superior se vacía en `durationMs`.
- [ ] **Pon el sombrero:** arrastrar el sombrero al personaje correcto → caras felices → recompensa aplicada (si `microgameReward` no es `none`, se refleja en el HUD: tiempo/vidas/pistas/etc.). Arrastrar al personaje incorrecto → caras enojadas → sin recompensa.
- [ ] **Home run:** tocar el bate en el momento correcto → win; tocar fuera de ventana o dejar pasar la pelota → lose.
- [ ] Al terminar el veredicto, la run continúa (fase vuelve a `playing`) sin quedarse trabada.
- [ ] Completar varias cajas alterna entre los dos juegos (selección prefiere no repetir por preferir "no descubiertos" mientras el set esté vacío se comporta aleatorio — aceptable).
- [ ] No hay caída de frames perceptible durante las animaciones.

- [ ] **Step 3: Si algo falla**

Usar superpowers:systematic-debugging. Los fallos de lógica pura deberían haber salido en tests; los fallos aquí serán de integración (posición de entidades, gestos, wiring del resultado).

- [ ] **Step 4: Commit final (si hubo ajustes de integración)**

```powershell
git add -A
git commit -m "fix(microjuegos): integration adjustments from e2e validation"
```

---

## Self-Review (cobertura del spec)

- **Registry liviano** → Task 3. **Selección + dificultad puras** → Task 4. **Runner único (timer/veredicto)** → Tasks 5,7,15. **Stage rectangular con tamaño px** → Task 6. **Primitivas de gesto** → Task 8. **Templates abiertos + resolver por juego** → Tasks 9-14 (config por juego, template agnóstico). **Timeout = derrota** → Task 5 + runner Task 15. **Integración con RunState (win→reward, lose→none)** → Task 18. **Assets bundled (seam en assets.ts)** → Tasks 13,14 (placeholder emoji, listo para sprites). **i18n** → Task 17. **Testing solo de lógica pura** → Tasks 3,4,9,11,13,14.
- **Fuera de alcance (declarado):** menú del tab, persistencia de descubiertos, categorías 3-9, arte final, warm-up con expo-asset (se omitió por simplicidad; el "beat ¿Listo?" no se implementó — si aparece parpadeo en validación, se añade con expo-asset en un follow-up).
- **Consistencia de tipos:** `MicrogameProps { difficulty, rng, onResult }`, `DragMatchConfig { targets, draggables }`, `TapTimingConfig { window, travelMs, ball, batter }`, `StageSizeContext` (px), `Reward.kind: 'time_boost'` (real), `Rng = () => number`. Nombres consistentes entre tasks.
```
