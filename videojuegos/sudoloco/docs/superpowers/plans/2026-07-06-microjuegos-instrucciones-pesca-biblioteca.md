# Microjuegos: instrucciones animadas, pesca y galería — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistema de instrucciones animadas para todos los microjuegos, tercer microjuego "Pesca" (tap-spam, con placeholders), y galería de prueba en `/biblioteca` accesible desde el home.

**Architecture:** El sistema de instrucciones es declarativo — cada `Microgame` describe su guion como `InstructionStep[]` y una primitiva compartida `InstructionHint` lo reproduce en bucle arriba a la derecha del stage; el runner la monta automáticamente. Pesca sigue el patrón existente (lógica pura testeable + componente que consume el kit). La galería vive dentro de la feature `microgames` y la ruta `app/biblioteca.tsx` solo compone.

**Tech Stack:** Expo SDK 54, RN 0.81, TypeScript estricto (`noUncheckedIndexedAccess`), Reanimated 4, Jest (proyectos `core` ts-jest y `unit` ts-jest/node), i18next.

**Spec:** `docs/superpowers/specs/2026-07-06-microjuegos-instrucciones-pesca-biblioteca-design.md`

> ⚠️ **Sin commits.** CLAUDE.md prohíbe hacer commits salvo pedido explícito del usuario. Cada task termina en verificación (typecheck/lint/test), NO en commit.

**Paralelización sugerida:** Tasks 1, 2+3, 4 y 6 son independientes entre sí y pueden correr en paralelo. Task 5 depende de 2+3 (usa `instructions` en el descriptor) y de 4 (usa `fishing.logic`). Task 7 documenta todo → al final. Task 8 = verificación integral.

---

### Task 1: Fix de Jest para assets de imagen

Los tests del proyecto `unit` fallan al importar archivos que hacen `require('*.png')` (hoy: `hat-match.config.test.ts`, preexistente). Se stubean imágenes con `moduleNameMapper`.

**Files:**
- Create: `jest/assetMock.js`
- Modify: `jest.config.js`

- [ ] **Step 1: Verificar el fallo actual**

Run: `npx jest src/features/microgames/__tests__/hat-match.config.test.ts`
Expected: FAIL con `SyntaxError: Invalid or unexpected token` apuntando a `cowboy.png`.

- [ ] **Step 2: Crear el mock de assets**

`jest/assetMock.js`:
```js
// Los require() de imágenes en RN resuelven a un número (asset id). El stub imita eso.
module.exports = 1;
```

- [ ] **Step 3: Mapear imágenes al mock en el proyecto `unit`**

En `jest.config.js`, dentro de `projects[1]` (displayName `'unit'`), añadir como PRIMERA entrada del `moduleNameMapper` (el orden importa — debe evaluarse antes que los alias):

```js
      moduleNameMapper: {
        '\\.(png|jpg|jpeg|gif|webp)$': '<rootDir>/jest/assetMock.js',
        '^@/(.*)$': '<rootDir>/src/$1',
        // ...resto igual
      },
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx jest src/features/microgames/__tests__/hat-match.config.test.ts`
Expected: PASS.

---

### Task 2: Tipos de instrucciones + componente `InstructionHint`

**Files:**
- Modify: `src/features/microgames/types.ts`
- Create: `src/features/microgames/kit/primitives/InstructionHint.tsx`

- [ ] **Step 1: Añadir tipos al contrato**

En `src/features/microgames/types.ts`, antes de `export interface Microgame`:

```ts
/** Paso del guion de instrucciones: qué mano mostrar, si hay partículas y cómo se mueve. */
export interface InstructionStep {
  hand: 'pointer' | 'clicking';
  particles?: boolean;
  /** Desplazamiento relativo (px) animado durante el paso. */
  move?: { dx: number; dy: number };
  durationMs: number;
}
```

Y en `Microgame` añadir el campo opcional (después de `thumbnail`):

```ts
  /** Guion del bucle de instrucciones (InstructionHint). Sin guion = sin overlay. */
  instructions?: InstructionStep[];
```

- [ ] **Step 2: Crear `InstructionHint`**

`src/features/microgames/kit/primitives/InstructionHint.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { InstructionStep } from '../../types';

const HAND_IMAGES = {
  pointer: require('../../../../../assets/microgames/instructions/pointer.png'),
  clicking: require('../../../../../assets/microgames/instructions/clicking.png'),
} as const;
const PARTICLES = require('../../../../../assets/microgames/instructions/particules.png');

const LOOP_PAUSE_MS = 400;

/**
 * Bucle de instrucciones arriba a la derecha del stage. Reproduce los pasos en
 * secuencia (imagen de mano + partículas + desplazamiento) y repite con una
 * pausa corta. No captura toques.
 */
export function InstructionHint({ steps }: { steps: InstructionStep[] }) {
  const [stepIndex, setStepIndex] = useState(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    const step = steps[stepIndex];
    if (!step) return;
    if (step.move) {
      tx.value = withTiming(tx.value + step.move.dx, { duration: step.durationMs });
      ty.value = withTiming(ty.value + step.move.dy, { duration: step.durationMs });
    }
    const isLast = stepIndex === steps.length - 1;
    const id = setTimeout(() => {
      if (isLast) {
        tx.value = 0;
        ty.value = 0;
      }
      setStepIndex(isLast ? 0 : stepIndex + 1);
    }, step.durationMs + (isLast ? LOOP_PAUSE_MS : 0));
    return () => clearTimeout(id);
  }, [stepIndex, steps, tx, ty]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  const step = steps[stepIndex];
  if (!step) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={animatedStyle}>
        {/* La punta del dedo apunta arriba-izquierda: las partículas van ahí. */}
        {step.particles && (
          <Image source={PARTICLES} style={styles.particles} resizeMode="contain" />
        )}
        <Image source={HAND_IMAGES[step.hand]} style={styles.hand} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 12,
    width: 96,
    height: 110,
    alignItems: 'center',
    zIndex: 6,
    opacity: 0.92,
  },
  hand: { width: 38, height: 42 },
  particles: {
    position: 'absolute',
    left: -10,
    top: -12,
    width: 30,
    height: 33,
  },
});
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

---

### Task 3: Integrar `InstructionHint` en el runner + guiones de hat-match y home-run

**Files:**
- Modify: `src/features/microgames/runner.tsx`
- Modify: `src/features/microgames/games/hat-match/index.tsx`
- Modify: `src/features/microgames/games/home-run/index.tsx`

- [ ] **Step 1: Montar el hint en el runner**

En `src/features/microgames/runner.tsx`:

Import nuevo (junto a los del kit):
```ts
import { InstructionHint } from './kit/primitives/InstructionHint';
```

Dentro del JSX de `MicrogameStage`, después de `<Game ... />` y antes del bloque de `result === 'lose'`:
```tsx
      {game.instructions && result === null && (
        <InstructionHint steps={game.instructions} />
      )}
```

- [ ] **Step 2: Guion de hat-match ("arrastra, no toques")**

En `src/features/microgames/games/hat-match/index.tsx`, en el objeto `hatMatch`, después de `Component: HatMatch,`:

```ts
  instructions: [
    { hand: 'pointer', durationMs: 600 },
    { hand: 'clicking', particles: true, durationMs: 350 },
    { hand: 'clicking', move: { dx: 0, dy: 40 }, durationMs: 700 },
  ],
```

- [ ] **Step 3: Guion de home-run ("atrás y luego swing")**

En `src/features/microgames/games/home-run/index.tsx`, en el objeto `homeRun`, después de `Component: HomeRun,`:

```ts
  instructions: [
    { hand: 'pointer', durationMs: 500 },
    { hand: 'clicking', move: { dx: -22, dy: 0 }, durationMs: 400 },
    { hand: 'clicking', particles: true, move: { dx: 45, dy: 0 }, durationMs: 300 },
  ],
```

- [ ] **Step 4: Verificar**

Run: `npm run typecheck` y `npx eslint src/features/microgames`
Expected: sin errores.

---

### Task 4: Lógica pura de pesca (TDD)

**Files:**
- Create: `src/features/microgames/__tests__/fishing.logic.test.ts`
- Create: `src/features/microgames/games/fishing/fishing.logic.ts`

- [ ] **Step 1: Escribir los tests (fallarán)**

`src/features/microgames/__tests__/fishing.logic.test.ts`:

```ts
import { createRng } from '@core/sudoku';
import { buildConfig, fishScale, fishFrame } from '../games/fishing/fishing.logic';

describe('fishing buildConfig', () => {
  it('difficulty 0: 8 taps y pique en [800, 1400] ms', () => {
    for (let i = 0; i < 50; i++) {
      const c = buildConfig(0, createRng(`easy-${i}`));
      expect(c.tapsRequired).toBe(8);
      expect(c.biteDelayMs).toBeGreaterThanOrEqual(800);
      expect(c.biteDelayMs).toBeLessThanOrEqual(1400);
    }
  });

  it('difficulty 1: 18 taps y pique en [1400, 2200] ms', () => {
    for (let i = 0; i < 50; i++) {
      const c = buildConfig(1, createRng(`hard-${i}`));
      expect(c.tapsRequired).toBe(18);
      expect(c.biteDelayMs).toBeGreaterThanOrEqual(1400);
      expect(c.biteDelayMs).toBeLessThanOrEqual(2200);
    }
  });

  it('clampea la dificultad fuera de 0..1', () => {
    expect(buildConfig(-1, createRng('a')).tapsRequired).toBe(8);
    expect(buildConfig(5, createRng('b')).tapsRequired).toBe(18);
  });

  it('es determinista con el mismo seed', () => {
    const a = buildConfig(0.5, createRng('same-seed'));
    const b = buildConfig(0.5, createRng('same-seed'));
    expect(a).toEqual(b);
  });
});

describe('fishScale', () => {
  it('empieza en 0.3 y termina en 1.0', () => {
    expect(fishScale(0, 10)).toBeCloseTo(0.3);
    expect(fishScale(10, 10)).toBeCloseTo(1.0);
  });

  it('es monótona creciente', () => {
    for (let t = 1; t <= 10; t++) {
      expect(fishScale(t, 10)).toBeGreaterThan(fishScale(t - 1, 10));
    }
  });

  it('no pasa de 1.0 con taps extra ni rompe con tapsRequired 0', () => {
    expect(fishScale(15, 10)).toBeCloseTo(1.0);
    expect(fishScale(3, 0)).toBe(1);
  });
});

describe('fishFrame', () => {
  it('cicla los frames con cada tap', () => {
    expect(fishFrame(0, 2)).toBe(0);
    expect(fishFrame(1, 2)).toBe(1);
    expect(fishFrame(2, 2)).toBe(0);
    expect(fishFrame(3, 2)).toBe(1);
  });

  it('devuelve 0 si no hay frames', () => {
    expect(fishFrame(5, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `npx jest src/features/microgames/__tests__/fishing.logic.test.ts`
Expected: FAIL — `Cannot find module '../games/fishing/fishing.logic'`.

- [ ] **Step 3: Implementar la lógica**

`src/features/microgames/games/fishing/fishing.logic.ts`:

```ts
import type { Rng } from '@core/sudoku';

export interface FishingConfig {
  /** Cuándo pica el pez (desde el inicio del microjuego). */
  biteDelayMs: number;
  /** Taps necesarios desde el pique para sacar al pez. */
  tapsRequired: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** difficulty 0 → pique temprano y pocos taps; difficulty 1 → tardío y muchos. */
export function buildConfig(difficulty: number, rng: Rng): FishingConfig {
  const d = clamp01(difficulty);
  const minDelay = 800 + 600 * d;
  const maxDelay = 1400 + 800 * d;
  return {
    biteDelayMs: Math.round(minDelay + rng() * (maxDelay - minDelay)),
    tapsRequired: Math.round(8 + 10 * d),
  };
}

/** Escala visual del pez: 0.3 sin taps → 1.0 al completar. Saturada. */
export function fishScale(taps: number, tapsRequired: number): number {
  if (tapsRequired <= 0) return 1;
  return 0.3 + 0.7 * clamp01(taps / tapsRequired);
}

/** Frame del pez a mostrar: cicla la secuencia con cada tap. */
export function fishFrame(taps: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  return taps % frameCount;
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `npx jest src/features/microgames/__tests__/fishing.logic.test.ts`
Expected: PASS (9 tests).

---

### Task 5: Juego Pesca — componente, placeholders, registro e i18n

Depende de Tasks 2+3 (campo `instructions`) y 4 (`fishing.logic`).

**Files:**
- Create: `src/features/microgames/games/fishing/assets.ts`
- Create: `src/features/microgames/games/fishing/index.tsx`
- Modify: `src/features/microgames/register.ts`
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/en.json`

- [ ] **Step 1: Assets placeholder**

`src/features/microgames/games/fishing/assets.ts`:

```ts
import type { Visual } from '../../types';

// Placeholders hasta recibir el arte final (fondo de lago con caña, secuencia de
// partículas de agua del pique, frames del pez). El swap de arte = cambiar estos
// Visual a { source: require('../../../../../assets/microgames/fishing/...') }.
export const FISH_FRAMES: Visual[] = [{ emoji: '🐟' }, { emoji: '🐠' }];
export const BITE_EMOJI = '🌊';
export const ROD_EMOJI = '🎣';
export const WATER_COLOR = '#7cc3e8';
```

- [ ] **Step 2: Componente y descriptor**

`src/features/microgames/games/fishing/index.tsx`:

```tsx
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@ui/primitives/Text';
import { StageSizeContext } from '../../kit/primitives/MicrogameStage';
import { TapZone } from '../../kit/primitives/TapZone';
import type { Microgame, MicrogameProps } from '../../types';
import { buildConfig, fishScale, fishFrame } from './fishing.logic';
import { FISH_FRAMES, BITE_EMOJI, ROD_EMOJI, WATER_COLOR } from './assets';

const Fishing: React.FC<MicrogameProps> = ({ difficulty, rng, onResult }) => {
  // Config fija por partida: consumir el rng una sola vez.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const config = useMemo(() => buildConfig(difficulty, rng), []);
  const stage = useContext(StageSizeContext);
  const [biting, setBiting] = useState(false);
  const [taps, setTaps] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => setBiting(true), config.biteDelayMs);
    return () => clearTimeout(id);
  }, [config.biteDelayMs]);

  const handleTap = () => {
    if (!biting || done.current) return;
    const next = taps + 1;
    setTaps(next);
    if (next >= config.tapsRequired) {
      done.current = true;
      onResult('win');
    }
  };

  const scale = fishScale(taps, config.tapsRequired);
  const fish = FISH_FRAMES[fishFrame(taps, FISH_FRAMES.length)];

  return (
    <TapZone x={0} y={0} width={stage.width} height={stage.height} onTap={handleTap}>
      <View style={styles.lake}>
        <Text style={styles.rod}>{ROD_EMOJI}</Text>
        {biting && taps === 0 && <Text style={styles.bite}>{BITE_EMOJI}</Text>}
        {biting && taps > 0 && fish != null && (
          <Text style={{ fontSize: 40 + 80 * scale }}>{fish.emoji}</Text>
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
  durationMs: 6000,
  Component: Fishing,
  instructions: [
    { hand: 'pointer', durationMs: 400 },
    { hand: 'clicking', particles: true, durationMs: 250 },
    { hand: 'pointer', durationMs: 200 },
    { hand: 'clicking', particles: true, durationMs: 250 },
    { hand: 'pointer', durationMs: 200 },
    { hand: 'clicking', particles: true, durationMs: 250 },
  ],
};

const styles = StyleSheet.create({
  lake: {
    width: '100%',
    height: '100%',
    backgroundColor: WATER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  rod: { fontSize: 44, position: 'absolute', top: 24, left: 24 },
  bite: { fontSize: 52 },
});
```

- [ ] **Step 3: Registrar el juego**

`src/features/microgames/register.ts` queda:

```ts
import { registerMicrogame } from './registry';
import { hatMatch } from './games/hat-match';
import { homeRun } from './games/home-run';
import { fishing } from './games/fishing';

// Agregar un microjuego = importar arriba + una línea aquí.
registerMicrogame(hatMatch);
registerMicrogame(homeRun);
registerMicrogame(fishing);
```

- [ ] **Step 4: i18n — añadir `fishing`, arreglar `hatMatch` huérfano**

La clave `microgames.hatMatch` (usada por el descriptor de hat-match) NO existe en los locales; hay una `ponElSombrero` sin referencias. Se corrige aquí.

En `src/i18n/locales/es.json`, la sección `microgames` queda:
```json
  "microgames": {
    "title": "¡Microjuego!",
    "ready": "¿Listo?",
    "hatMatch": "Pon el sombrero",
    "homeRun": "Home run",
    "fishing": "¡A pescar!"
  }
```

En `src/i18n/locales/en.json`, la sección `microgames` queda:
```json
  "microgames": {
    "title": "Microgame!",
    "ready": "Ready?",
    "hatMatch": "Put the hat on",
    "homeRun": "Home run",
    "fishing": "Gone fishing!"
  }
```

- [ ] **Step 5: Verificar**

Run: `npm run typecheck && npx jest src/features/microgames`
Expected: sin errores de tipos; tests de microgames en verde.

---

### Task 6: Galería de microjuegos + ruta `/biblioteca` + botón del home

Independiente de las demás tasks (usa el runner tal como existe).

**Files:**
- Create: `src/features/microgames/gallery/MicrogameGallery.tsx`
- Modify: `src/features/microgames/index.ts`
- Create: `app/biblioteca.tsx`
- Modify: `app/(tabs)/home.tsx`
- Modify: `src/i18n/locales/es.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `.expo/types/router.d.ts` (regenerable; se edita para que el typecheck acepte la ruta nueva sin arrancar Metro)

- [ ] **Step 1: Componente de galería**

`src/features/microgames/gallery/MicrogameGallery.tsx`:

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@ui/primitives/Text';
import { useTranslation } from 'react-i18next';
import { createRng } from '@core/sudoku';
import type { Rng } from '@core/sudoku';
import { colors } from '@theme/colors';
import { listMicrogames } from '../registry';
import { MicrogameRunner } from '../runner';
import type { Microgame, MicrogameResult } from '../types';

const DIFFICULTIES = [
  { key: 'easy', value: 0.15 },
  { key: 'medium', value: 0.5 },
  { key: 'hard', value: 0.9 },
] as const;

interface Session {
  game: Microgame;
  difficulty: number;
  rng: Rng;
  nonce: number;
}

/** Sandbox de microjuegos: lista + dificultad + runner real, sin recompensas. */
export function MicrogameGallery() {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<number>(0.5);
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<MicrogameResult | null>(null);

  const play = (game: Microgame, diff: number, nonce: number) => {
    setResult(null);
    setSession({
      game,
      difficulty: diff,
      rng: createRng(`gallery-${game.id}-${nonce}-${String(Date.now())}`),
      nonce,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.diffRow}>
        {DIFFICULTIES.map((d) => (
          <Pressable
            key={d.key}
            onPress={() => setDifficulty(d.value)}
            style={[styles.chip, difficulty === d.value && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, difficulty === d.value && styles.chipTextActive]}
            >
              {t(`biblioteca.difficulty.${d.key}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {listMicrogames().map((game) => (
        <Pressable
          key={game.id}
          style={styles.row}
          onPress={() => play(game, difficulty, 0)}
        >
          <View>
            <Text style={styles.rowTitle}>{t(game.nameKey)}</Text>
            <Text style={styles.rowSubtitle}>
              {t(`biblioteca.category.${game.category}`, { defaultValue: game.category })}
            </Text>
          </View>
          <Text style={styles.playIcon}>▶</Text>
        </Pressable>
      ))}

      {session && !result && (
        <MicrogameRunner
          key={`${session.game.id}-${session.nonce}`}
          game={session.game}
          difficulty={session.difficulty}
          rng={session.rng}
          onFinish={(r) => setResult(r)}
        />
      )}

      {session && result && (
        <View style={styles.resultOverlay}>
          <Text style={styles.resultText}>
            {result === 'win' ? t('biblioteca.win') : t('biblioteca.lose')}
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => play(session.game, session.difficulty, session.nonce + 1)}
          >
            <Text style={styles.primaryBtnText}>{t('biblioteca.playAgain')}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              setSession(null);
              setResult(null);
            }}
          >
            <Text style={styles.secondaryBtnText}>{t('biblioteca.exit')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 10 },
  diffRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.bg.surface,
  },
  chipActive: { backgroundColor: colors.brand.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  chipTextActive: { color: '#ffffff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  rowSubtitle: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  playIcon: { fontSize: 18, color: colors.brand.primary },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 20,
  },
  resultText: { fontSize: 28, fontWeight: '900', color: colors.text.primary },
  primaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  secondaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brand.primary,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: colors.brand.primary },
});
```

- [ ] **Step 2: Exportar desde la feature**

En `src/features/microgames/index.ts` añadir:
```ts
export { MicrogameGallery } from './gallery/MicrogameGallery';
```

- [ ] **Step 3: Ruta `app/biblioteca.tsx`**

```tsx
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@ui/primitives/Text';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MicrogameGallery } from '@features/microgames';
import { useStatusBarConfig } from '@/providers/StatusBarProvider';
import { colors } from '@theme/colors';

export default function BibliotecaScreen() {
  const { t } = useTranslation();
  const { setConfig } = useStatusBarConfig();

  useFocusEffect(
    useCallback(() => {
      setConfig({ backgroundColor: '#0f172a', barStyle: 'light' });
    }, [setConfig])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('biblioteca.title')}</Text>
        <Text style={styles.sectionLabel}>{t('biblioteca.microgamesSection')}</Text>
        <View style={styles.gallery}>
          <MicrogameGallery />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.base },
  content: { padding: 24, gap: 16, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text.primary },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gallery: { flex: 1 },
});
```

Nota: el runner usa `StyleSheet.absoluteFillObject` — dentro del ScrollView cubre el área visible de la pantalla porque `content` tiene `flexGrow: 1` y `gallery` `flex: 1`. Verificar en emulador que el overlay cubre; si quedara corto, mover `<MicrogameGallery />` fuera del ScrollView (View con flex: 1).

- [ ] **Step 4: Botón del home**

En `app/(tabs)/home.tsx`, `handlePress` queda:

```ts
  const handlePress = (key: ModeKey) => {
    if (key === 'sudoloco') router.push('/sudoloco');
    if (key === 'biblio') router.push('/biblioteca');
  };
```

- [ ] **Step 5: i18n de biblioteca**

En `src/i18n/locales/es.json`, añadir sección top-level (después de `microgames`):
```json
  "biblioteca": {
    "title": "Biblioteca",
    "microgamesSection": "Microjuegos",
    "win": "¡Ganaste!",
    "lose": "Fallaste...",
    "playAgain": "Jugar otra vez",
    "exit": "Salir",
    "difficulty": { "easy": "Fácil", "medium": "Media", "hard": "Difícil" },
    "category": {
      "drag-match": "Arrastrar",
      "tap-timing": "Timing",
      "tap-spam": "Machacar"
    }
  }
```

En `src/i18n/locales/en.json`:
```json
  "biblioteca": {
    "title": "Library",
    "microgamesSection": "Microgames",
    "win": "You won!",
    "lose": "You missed...",
    "playAgain": "Play again",
    "exit": "Exit",
    "difficulty": { "easy": "Easy", "medium": "Medium", "hard": "Hard" },
    "category": {
      "drag-match": "Drag",
      "tap-timing": "Timing",
      "tap-spam": "Mash"
    }
  }
```

- [ ] **Step 6: Typed route (para que el typecheck pase sin arrancar Metro)**

`.expo/types/router.d.ts` es generado; Metro lo regenerará idéntico en el próximo `npm start`. Editarlo a mano con 3 reemplazos:

1. Reemplazar TODAS las ocurrencias (2) de:
   `` { pathname: `/sudoloco`; params?: Router.UnknownInputParams; } ``
   por:
   `` { pathname: `/sudoloco`; params?: Router.UnknownInputParams; } | { pathname: `/biblioteca`; params?: Router.UnknownInputParams; } ``

2. Reemplazar la ocurrencia (1) de:
   `` { pathname: `/sudoloco`; params?: Router.UnknownOutputParams; } ``
   por:
   `` { pathname: `/sudoloco`; params?: Router.UnknownOutputParams; } | { pathname: `/biblioteca`; params?: Router.UnknownOutputParams; } ``

3. Reemplazar la ocurrencia (1) de:
   ``  `/sudoloco${`?${string}` | `#${string}` | ''}` ``
   por:
   ``  `/sudoloco${`?${string}` | `#${string}` | ''}` | `/biblioteca${`?${string}` | `#${string}` | ''}` ``

- [ ] **Step 7: Verificar**

Run: `npm run typecheck && npx eslint app/biblioteca.tsx src/features/microgames/gallery "app/(tabs)/home.tsx"`
Expected: sin errores.

---

### Task 7: README de microjuegos + script de reescalado + referencia en CLAUDE.md

Al final, para documentar lo ya construido.

**Files:**
- Create: `src/features/microgames/README.md`
- Create: `scripts/resize-assets.mjs`
- Modify: `CLAUDE.md`

- [ ] **Step 1: README**

`src/features/microgames/README.md`:

````markdown
# Microjuegos — guía de la feature

Sistema de microjuegos estilo WarioWare. En Sudoloco salen al completar una caja;
en la Biblioteca (`/biblioteca`) se pueden probar todos en sandbox.

## Contrato

Un microjuego es un `Microgame` (ver `types.ts`):

- `id` único (kebab-case), `nameKey` de i18n (`microgames.<id en camelCase>`).
- `category`: una de las de `MicrogameCategory`.
- `minLevel`: nivel de run desde el que puede aparecer.
- `durationMs`: límite de tiempo. El timeout lo maneja el runner (= derrota).
- `Component: React.FC<MicrogameProps>` — recibe `difficulty` (0..1), `rng`
  (PRNG sembrado, determinista) y `onResult('win' | 'lose')`.
- `instructions?: InstructionStep[]` — guion del bucle de instrucciones.

## Reglas

1. **Determinismo**: todo lo aleatorio sale del `rng` recibido. Nunca `Math.random()`.
   Consumir el rng una sola vez por partida (`useMemo(..., [])`).
2. **Lógica pura separada**: dificultad → parámetros y cálculos de estado van en
   `games/<id>/<id>.logic.ts` con tests en `__tests__/`. El componente solo presenta.
3. **El juego reporta, el runner arbitra**: el componente llama `onResult` como
   máximo una vez; timeout y overlays de derrota son del runner.
4. **i18n**: cero strings literales en JSX; añadir claves en `es.json` y `en.json`.
5. **Dificultad 0..1**: en Sudoloco viene de `levelToDifficulty(level)` (satura al
   nivel 20). Escalar parámetros con interpolación lineal y `clamp`.

## Cómo registrar un juego nuevo

1. Carpeta `games/<id>/` con `index.tsx` (componente + descriptor exportado),
   `<id>.logic.ts` (+ tests) y `assets.ts`.
2. En `register.ts`: importar el descriptor + `registerMicrogame(<juego>)`.
3. Claves i18n en ambos locales.
4. Probarlo en la Biblioteca (botón library del home → Microjuegos).

## Instrucciones animadas

`InstructionHint` (kit) reproduce en bucle el guion `instructions` arriba a la
derecha del stage. Imágenes compartidas en `assets/microgames/instructions/`
(`pointer.png`, `clicking.png`, `particules.png`; la punta del dedo apunta
arriba-izquierda, las partículas se anclan ahí). Cada paso declara mano,
partículas, desplazamiento relativo (`move`) y duración. Ejemplos en los
descriptores de hat-match (arrastre), home-run (swing) y fishing (machacar).

## Assets

- Carpeta por juego: `assets/microgames/<id>/`. Compartidos: `instructions/`.
- Imágenes a máximo 512 px por lado. Reescalar con:
  `node scripts/resize-assets.mjs assets/microgames/<id> --max 512`
- Placeholders con emoji (`Visual.emoji`) hasta tener arte; el swap es cambiar
  `assets.ts` a `{ source: require(...) }`.

## Kit

- `MicrogameStage`: marco 3:4 + `StageSizeContext` con el tamaño en px.
- `TapZone`, `Draggable`: interacción posicionada absoluta.
- `useMicrogameTimer`: countdown en UI-thread.
- `VerdictReaction`: reacción de derrota.
- Templates: `DragMatchGame`, `TapTimingGame` (+ su `.logic.ts`).
````

- [ ] **Step 2: Script de reescalado**

`scripts/resize-assets.mjs` (usa `sharp`, ya en devDependencies):

```js
#!/usr/bin/env node
// Reescala imágenes a un máximo de --max px por lado (default 512), en sitio.
// Uso: node scripts/resize-assets.mjs <archivo-o-carpeta> [...] [--max 512]
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const args = process.argv.slice(2);
const maxFlag = args.indexOf('--max');
const maxSize = maxFlag >= 0 ? Number(args[maxFlag + 1]) : 512;
const inputs = args.filter((a, i) => i !== maxFlag && i !== maxFlag + 1);

if (inputs.length === 0 || !Number.isFinite(maxSize) || maxSize <= 0) {
  console.error('Uso: node scripts/resize-assets.mjs <archivo-o-carpeta> [...] [--max 512]');
  process.exit(1);
}

async function collect(target) {
  const stat = await fs.stat(target);
  if (stat.isFile()) {
    return EXTENSIONS.has(path.extname(target).toLowerCase()) ? [target] : [];
  }
  const entries = await fs.readdir(target, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => collect(path.join(target, e.name))),
  );
  return nested.flat();
}

const files = (await Promise.all(inputs.map(collect))).flat();
for (const file of files) {
  const meta = await sharp(file).metadata();
  if ((meta.width ?? 0) <= maxSize && (meta.height ?? 0) <= maxSize) {
    console.log(`ok      ${file} (${meta.width}x${meta.height})`);
    continue;
  }
  const buffer = await sharp(file)
    .resize({ width: maxSize, height: maxSize, fit: 'inside' })
    .toBuffer();
  await fs.writeFile(file, buffer);
  const after = await sharp(file).metadata();
  console.log(`resized ${file} (${meta.width}x${meta.height} -> ${after.width}x${after.height})`);
}
```

- [ ] **Step 3: Referencia en CLAUDE.md**

En CLAUDE.md, sección "## Cómo trabajar en este repo", añadir como bullet después del primero ("Antes de implementar algo nuevo..."):

```markdown
- **Microjuegos**: antes de tocar `src/features/microgames/`, lee su guía [src/features/microgames/README.md](src/features/microgames/README.md) (contrato, registro, instrucciones animadas, assets).
```

- [ ] **Step 4: Probar el script con las imágenes existentes (no debe tocarlas)**

Run: `node scripts/resize-assets.mjs assets/microgames/instructions`
Expected: tres líneas `ok ... (84x92)` — sin reescalar nada.

---

### Task 8: Verificación integral

- [ ] **Step 1: Suite completa**

Run: `npm run typecheck && npm run lint && npm test`
Expected: typecheck sin errores; lint sin errores; **todas** las suites de Jest en verde (incluida `hat-match.config.test.ts`, rota antes de este plan, y `fishing.logic.test.ts` nueva).

- [ ] **Step 2: Smoke manual (usuario, en emulador)**

1. Home → botón library → Biblioteca → sección Microjuegos: se listan Pon el sombrero / Home run / ¡A pescar!.
2. Jugar pesca en las 3 dificultades: lago quieto → 🌊 pique → taps hacen crecer 🐟/🐠 → win; dejar correr el tiempo → lose con carita.
3. Los 3 juegos muestran el bucle de instrucciones arriba a la derecha (hat-match: arrastre hacia abajo; home-run: atrás→swing; pesca: taps rápidos).
4. Run de Sudoloco: al completar una caja puede salir pesca y las recompensas siguen funcionando.
