# Animación de objeto ganado en microjuegos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Nota de commits:** CLAUDE.md pide no commitear sin OK del usuario. Los pasos de commit están incluidos por higiene TDD, pero al ejecutar se confirma con el usuario antes de commitear (o se agrupan al final).

**Goal:** Al ganar un microjuego, el objeto de la recompensa sube desde abajo de la pantalla al centro ganando opacidad, da un brinquito y cae rápido hasta desaparecer; al terminar esa animación se otorga la recompensa y se sale del microjuego. Ganar siempre otorga premio (se elimina `none`).

**Architecture:** Enfoque B (overlay en la pantalla). El `MicrogameRunner` solo reporta win/lose; en victoria ya no muestra la cara feliz. `SudolocoScreen` monta un overlay `RewardReveal` cuando el resultado es victoria, y otorga el premio (`grantReward`) al terminar su animación. El mapeo recompensa→icono es una función pura (`rewardVisual`) testeable en node; la resolución a PNG (`actionIcons`) vive en el componente Reanimated.

**Tech Stack:** React Native 0.81, React 19, Reanimated 4, Zustand, TypeScript estricto, Jest (ts-jest, dos proyectos: `core` y `unit`).

**Design doc:** `docs/superpowers/specs/2026-07-03-reward-reveal-microjuego-design.md`

---

## Estructura de archivos

- **Modificar** `src/core/sudoku/rewards.ts` — eliminar `none` del tipo, tablas y `rollReward` (rueda contra el total real de pesos).
- **Modificar** `src/core/sudoku/__tests__/rewards.test.ts` — actualizar y añadir test "nunca `none`".
- **Modificar** `src/features/sudoloco/store.ts` — quitar `case 'none'` de `grantReward`.
- **Crear** `src/features/sudoloco/rewardVisual.ts` — función pura recompensa→visual (emoji o clave de icono).
- **Crear** `src/features/sudoloco/__tests__/rewardVisual.test.ts` — test exhaustivo del mapeo.
- **Crear** `src/features/sudoloco/ui/RewardReveal.tsx` — animación Reanimated del objeto.
- **Modificar** `src/features/microjuegos/runner.tsx` — `VerdictReaction` solo en derrota; en victoria `onFinish('win')` inmediato.
- **Modificar** `src/features/sudoloco/screen.tsx` — estado `revealReward`, gating del runner, overlay `RewardReveal`.

---

## Task 1: Core — eliminar `none` del sorteo de recompensas

**Files:**

- Modify: `src/core/sudoku/rewards.ts`
- Modify: `src/core/sudoku/__tests__/rewards.test.ts`
- Modify: `src/features/sudoloco/store.ts`

- [ ] **Step 1: Actualizar los tests (fallarán contra el código actual)**

Reemplazar el contenido de `src/core/sudoku/__tests__/rewards.test.ts` por:

```ts
import { rollReward } from '../rewards';
import { createRng } from '../prng';
import type { Rng } from '../prng';

describe('rollReward', () => {
  let rng: Rng;

  beforeEach(() => {
    rng = createRng('test-seed');
  });

  const VALID_KINDS = [
    'time_boost',
    'hint',
    'silver_cell',
    'golden_cell',
    'life',
    'crystal_heart',
  ];

  it('retorna un Reward válido (sin none)', () => {
    const reward = rollReward(1, rng);
    expect(reward).toHaveProperty('kind');
    expect(VALID_KINDS).toContain(reward.kind);
  });

  it('nunca devuelve none en todo el rango de niveles y seeds', () => {
    for (let level = 1; level <= 25; level++) {
      for (let i = 0; i < 200; i++) {
        const reward = rollReward(level, createRng(`L${level}-${i}`));
        expect(reward.kind).not.toBe('none');
        expect(VALID_KINDS).toContain(reward.kind);
      }
    }
  });

  it('time_boost puede ocurrir', () => {
    let found = false;
    for (let i = 0; i < 100; i++) {
      if (rollReward(1, createRng(`seed-${i}`)).kind === 'time_boost') {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('golden_cell es más probable en nivel alto que en nivel bajo', () => {
    let earlyCount = 0;
    for (let i = 0; i < 200; i++) {
      if (rollReward(1, createRng(`early-${i}`)).kind === 'golden_cell')
        earlyCount++;
    }
    let lateCount = 0;
    for (let i = 0; i < 200; i++) {
      if (rollReward(20, createRng(`late-${i}`)).kind === 'golden_cell')
        lateCount++;
    }
    expect(lateCount).toBeGreaterThan(earlyCount);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- rewards`
Expected: FAIL — el test "nunca devuelve none" falla porque el código actual sí devuelve `none`.

- [ ] **Step 3: Implementar — eliminar `none` de `rewards.ts`**

Reemplazar el contenido de `src/core/sudoku/rewards.ts` por:

```ts
import type { Rng } from './prng';

export type Reward =
  | { kind: 'time_boost' }
  | { kind: 'hint' }
  | { kind: 'silver_cell' }
  | { kind: 'golden_cell' }
  | { kind: 'life' }
  | { kind: 'crystal_heart' };

interface RewardWeights {
  time_boost: number;
  hint: number;
  silver_cell: number;
  golden_cell: number;
  life: number;
  crystal_heart: number;
}

// Tabla de pesos relativos. No es obligatorio que sumen 100: rollReward rueda
// contra el total real, así que quitar `none` conserva las proporciones exactas
// entre las recompensas restantes (renormalización implícita).
const WEIGHTS_BY_LEVEL = {
  early: {
    time_boost: 8,
    hint: 24,
    silver_cell: 12,
    golden_cell: 6,
    life: 13,
    crystal_heart: 10,
  } as RewardWeights,
  late: {
    time_boost: 10,
    hint: 20,
    silver_cell: 14,
    golden_cell: 16,
    life: 14,
    crystal_heart: 8,
  } as RewardWeights,
};

function interpolateWeights(level: number): RewardWeights {
  if (level <= 10) return WEIGHTS_BY_LEVEL.early;
  if (level >= 20) return WEIGHTS_BY_LEVEL.late;

  const t = (level - 10) / 10;
  const early = WEIGHTS_BY_LEVEL.early;
  const late = WEIGHTS_BY_LEVEL.late;

  return {
    time_boost: early.time_boost + (late.time_boost - early.time_boost) * t,
    hint: early.hint + (late.hint - early.hint) * t,
    silver_cell: early.silver_cell + (late.silver_cell - early.silver_cell) * t,
    golden_cell: early.golden_cell + (late.golden_cell - early.golden_cell) * t,
    life: early.life + (late.life - early.life) * t,
    crystal_heart:
      early.crystal_heart + (late.crystal_heart - early.crystal_heart) * t,
  };
}

export function rollReward(level: number, rng: Rng): Reward {
  const w = interpolateWeights(level);
  const total =
    w.time_boost +
    w.hint +
    w.silver_cell +
    w.golden_cell +
    w.life +
    w.crystal_heart;
  const roll = rng() * total;

  let cumulative = 0;

  if ((cumulative += w.time_boost) >= roll) return { kind: 'time_boost' };
  if ((cumulative += w.hint) >= roll) return { kind: 'hint' };
  if ((cumulative += w.silver_cell) >= roll) return { kind: 'silver_cell' };
  if ((cumulative += w.golden_cell) >= roll) return { kind: 'golden_cell' };
  if ((cumulative += w.life) >= roll) return { kind: 'life' };
  return { kind: 'crystal_heart' };
}
```

- [ ] **Step 4: Quitar `case 'none'` de `grantReward`**

En `src/features/sudoloco/store.ts`, dentro de `grantReward`, eliminar estas dos líneas (actualmente ~196-197):

```ts
      case 'none':
        break;
```

El `switch` queda cubriendo exhaustivamente los 6 `kind` restantes.

- [ ] **Step 5: Correr tests y typecheck**

Run: `npm test -- rewards`
Expected: PASS (todos).

Run: `npm run typecheck`
Expected: PASS — sin errores. (Si `grantReward` diera error de exhaustividad, revisar que se borró el `case 'none'`.)

- [ ] **Step 6: Commit**

```bash
git add src/core/sudoku/rewards.ts src/core/sudoku/__tests__/rewards.test.ts src/features/sudoloco/store.ts
git commit -m "feat(rewards): ganar microjuego siempre otorga premio (eliminar none)"
```

---

## Task 2: `rewardVisual` — mapeo puro recompensa → visual

**Files:**

- Create: `src/features/sudoloco/rewardVisual.ts`
- Create: `src/features/sudoloco/__tests__/rewardVisual.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/sudoloco/__tests__/rewardVisual.test.ts`:

```ts
import { rewardVisual } from '../rewardVisual';
import type { Reward } from '@core/sudoku';

describe('rewardVisual', () => {
  it('time_boost usa emoji (placeholder temporal)', () => {
    const v = rewardVisual({ kind: 'time_boost' });
    expect(v).toEqual({ emoji: '⏱️' });
  });

  it.each([
    ['hint', 'hint'],
    ['silver_cell', 'silverCell'],
    ['golden_cell', 'goldenCell'],
    ['life', 'heart'],
    ['crystal_heart', 'frozenHeart'],
  ] as const)('%s usa el icono %s', (kind, icon) => {
    const v = rewardVisual({ kind } as Reward);
    expect(v).toEqual({ icon });
  });

  it('todo Reward produce un visual con emoji o icon', () => {
    const kinds: Reward['kind'][] = [
      'time_boost',
      'hint',
      'silver_cell',
      'golden_cell',
      'life',
      'crystal_heart',
    ];
    for (const kind of kinds) {
      const v = rewardVisual({ kind } as Reward);
      const hasEmoji = 'emoji' in v && v.emoji.length > 0;
      const hasIcon = 'icon' in v && v.icon.length > 0;
      expect(hasEmoji || hasIcon).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- rewardVisual`
Expected: FAIL — "Cannot find module '../rewardVisual'".

- [ ] **Step 3: Implementar `rewardVisual.ts`**

Crear `src/features/sudoloco/rewardVisual.ts`:

```ts
import type { Reward } from '@core/sudoku';

// Claves de icono que RewardReveal resuelve contra @ui/icons (actionIcons).
// Se mantienen como string literal (no `keyof typeof actionIcons`) para que este
// módulo sea puro y testeable en node sin importar los PNG.
export type RewardIcon =
  | 'hint'
  | 'silverCell'
  | 'goldenCell'
  | 'heart'
  | 'frozenHeart';

export type RewardVisual = { emoji: string } | { icon: RewardIcon };

// time_boost es placeholder emoji hasta tener su imagen (tarea futura del usuario).
export function rewardVisual(reward: Reward): RewardVisual {
  switch (reward.kind) {
    case 'time_boost':
      return { emoji: '⏱️' };
    case 'hint':
      return { icon: 'hint' };
    case 'silver_cell':
      return { icon: 'silverCell' };
    case 'golden_cell':
      return { icon: 'goldenCell' };
    case 'life':
      return { icon: 'heart' };
    case 'crystal_heart':
      return { icon: 'frozenHeart' };
  }
}
```

- [ ] **Step 4: Correr el test y typecheck**

Run: `npm test -- rewardVisual`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/sudoloco/rewardVisual.ts src/features/sudoloco/__tests__/rewardVisual.test.ts
git commit -m "feat(sudoloco): rewardVisual, mapeo puro recompensa->icono"
```

---

## Task 3: Componente `RewardReveal` (animación del objeto)

**Files:**

- Create: `src/features/sudoloco/ui/RewardReveal.tsx`

No lleva test unitario: es Reanimated puro (igual que `VerdictReaction`), se valida en el emulador en la Task 6.

- [ ] **Step 1: Crear `RewardReveal.tsx`**

Crear `src/features/sudoloco/ui/RewardReveal.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  Image,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import type { Reward } from '@core/sudoku';
import { actionIcons } from '@ui/icons';
import { rewardVisual, type RewardIcon } from '../rewardVisual';

const BELOW = 260; // desplazamiento inicial por debajo del centro (px)
const RISE_MS = 450;
const HOP_MS = 350; // subida + bajada del brinquito (dividido en dos mitades)
const FALL_MS = 220;
const OBJECT = 96;

const ICON_SOURCE: Record<RewardIcon, ImageSourcePropType> = {
  hint: actionIcons.hint,
  silverCell: actionIcons.silverCell,
  goldenCell: actionIcons.goldenCell,
  heart: actionIcons.heart,
  frozenHeart: actionIcons.frozenHeart,
};

export function RewardReveal({
  reward,
  onDone,
}: {
  reward: Reward;
  onDone: () => void;
}) {
  const translateY = useSharedValue(BELOW);
  const opacity = useSharedValue(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const fire = () => doneRef.current();

  useEffect(() => {
    // Opacidad: aparece durante la subida, se mantiene en el brinquito, se desvanece en la caída.
    opacity.value = withSequence(
      withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.cubic) }),
      withDelay(
        HOP_MS,
        withTiming(0, { duration: FALL_MS, easing: Easing.in(Easing.cubic) }),
      ),
    );
    // translateY: A subir al centro · B brinquito (arriba/abajo) · C caer rápido -> onDone.
    translateY.value = withSequence(
      withTiming(0, { duration: RISE_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(-24, {
        duration: HOP_MS / 2,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(0, { duration: HOP_MS / 2, easing: Easing.in(Easing.quad) }),
      withTiming(
        BELOW,
        { duration: FALL_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished) runOnJS(fire)();
        },
      ),
    );
  }, []);

  const objectStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.35,
  }));

  const visual = rewardVisual(reward);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <Animated.View style={[styles.object, objectStyle]}>
        {'icon' in visual ? (
          <Image
            source={ICON_SOURCE[visual.icon]}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.emoji}>{visual.emoji}</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  object: {
    width: OBJECT,
    height: OBJECT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: OBJECT, height: OBJECT },
  emoji: { fontSize: OBJECT * 0.8 },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/sudoloco/ui/RewardReveal.tsx
git commit -m "feat(sudoloco): componente RewardReveal (objeto sube, brinquito, cae)"
```

---

## Task 4: Runner — victoria sin cara feliz

**Files:**

- Modify: `src/features/microjuegos/runner.tsx`

- [ ] **Step 1: Ajustar el runner**

En `src/features/microjuegos/runner.tsx`:

1. Añadir `useEffect` y `useRef` al import de React:

```tsx
import React, { useEffect, useRef, useState } from 'react';
```

2. Dentro de `MicrogameRunner`, tras la línea `const [result, setResult] = useState<MicrogameResult | null>(null);`, añadir el disparo inmediato en victoria:

```tsx
const onFinishRef = useRef(onFinish);
onFinishRef.current = onFinish;

// En victoria el remate lo hace el overlay de la pantalla (RewardReveal): salimos
// de inmediato, sin mostrar la cara feliz. La derrota sí conserva VerdictReaction.
useEffect(() => {
  if (result === 'win') onFinishRef.current('win');
}, [result]);
```

3. Reemplazar el render del veredicto:

```tsx
{
  result !== null && (
    <VerdictReaction result={result} onDone={() => onFinish(result)} />
  );
}
```

por:

```tsx
{
  result === 'lose' && (
    <VerdictReaction result="lose" onDone={() => onFinish('lose')} />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/microjuegos/runner.tsx
git commit -m "feat(microjuegos): victoria sale sin cara feliz (remate en la pantalla)"
```

---

## Task 5: Pantalla — overlay del objeto y otorgar al terminar

**Files:**

- Modify: `src/features/sudoloco/screen.tsx`

- [ ] **Step 1: Importar `RewardReveal`**

En `src/features/sudoloco/screen.tsx`, añadir junto a los imports de `./ui`:

```tsx
import { RewardReveal } from './ui/RewardReveal';
```

- [ ] **Step 2: Añadir estado `revealReward`**

Debajo de `const [activeMicrogame, setActiveMicrogame] = useState<Microgame | null>(null);` (y su efecto), añadir:

```tsx
const [revealReward, setRevealReward] = useState<Reward | null>(null);
```

- [ ] **Step 3: Gating del runner y nuevo `onFinish`**

Reemplazar el bloque actual del runner (aproximadamente líneas 285-297):

```tsx
{
  phase === 'microgame' && activeMicrogame && rng && (
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
  );
}
```

por:

```tsx
{
  phase === 'microgame' && activeMicrogame && rng && !revealReward && (
    <MicrogameRunner
      game={activeMicrogame}
      difficulty={levelToDifficulty(level)}
      rng={rng}
      onFinish={(result) => {
        // Victoria con premio: arranca el overlay del objeto; el premio se
        // otorga al terminar su animación (onDone). Derrota: salir directo.
        if (result === 'win' && microgameReward) {
          setRevealReward(microgameReward);
        } else {
          exitMicrogame();
        }
      }}
    />
  );
}

{
  revealReward && (
    <RewardReveal
      reward={revealReward}
      onDone={() => {
        grantReward(revealReward);
        setRevealReward(null);
        exitMicrogame();
      }}
    />
  );
}
```

- [ ] **Step 4: Typecheck y tests completos**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm test`
Expected: PASS (toda la suite).

- [ ] **Step 5: Commit**

```bash
git add src/features/sudoloco/screen.tsx
git commit -m "feat(sudoloco): overlay RewardReveal y premio al terminar la animación"
```

---

## Task 6: Verificación en el emulador

**Files:** ninguno (validación manual).

- [ ] **Step 1: Lanzar la app**

Run: `npm run android`
Expected: compila y arranca en el emulador Android.

- [ ] **Step 2: Verificar el flujo de victoria**

Jugar una run de Sudoloco hasta completar una caja y disparar un microjuego. Ganarlo. Verificar:

- Al ganar NO aparece la cara feliz `😄🎉😄`.
- El objeto de la recompensa (PNG de hint/vida/etc., o ⏱️ si tocó tiempo) sube desde abajo al centro ganando opacidad, da un brinquito y cae rápido hasta desaparecer.
- Al terminar la animación se vuelve al sudoku y la recompensa está aplicada (p. ej. el tiempo del HUD subió, o hay +1 pista/vida).
- Nunca sale "sin premio": ganar siempre otorga algo.

- [ ] **Step 3: Verificar el flujo de derrota**

Perder un microjuego (dejar pasar el tiempo o fallar). Verificar:

- Aparece la cara triste actual `😠😞😠`.
- Al terminar, se vuelve al sudoku sin recompensa.

---

## Self-Review

- **Cobertura del spec:** eliminar `none` (Task 1) · `rewardVisual` con emoji para time_boost e iconos PNG para el resto (Task 2) · animación subir/brinquito/caer (Task 3) · victoria sin cara feliz (Task 4) · overlay + premio al terminar la animación + derrota sin cambios (Task 5) · validación visual (Task 6). Todas las secciones del spec tienen tarea.
- **Placeholders:** ninguno; todo el código está completo.
- **Consistencia de tipos:** `Reward` sin `none` (Task 1) usado por `rewardVisual` (Task 2), `RewardReveal` (Task 3) y `screen.tsx` (Task 5). `RewardIcon` y `RewardVisual` definidos en Task 2, consumidos en Task 3 (`ICON_SOURCE: Record<RewardIcon, ...>`). `onFinish(result: MicrogameResult)` sin cambios de firma; el runner solo cambia cuándo lo llama.
