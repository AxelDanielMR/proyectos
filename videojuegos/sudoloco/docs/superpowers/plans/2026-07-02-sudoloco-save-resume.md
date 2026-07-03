# Sudoloco — Save automático y reanudación · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guardar automáticamente la partida de Sudoloco y permitir reanudarla exactamente donde se quedó (tablero celda por celda) tras cerrar la app, persistiendo highscore y monedas en Firebase al terminar.

**Architecture:** El estado vive en dos stores (run: `useSudolocoStore`; puzzle: store factory de `SudokuGame`). Un módulo puro serializa/deserializa un `SavedRun` (regenerando el puzzle determinista desde `seed + level`, guardando solo lo mutable). Un wrapper de IO lo persiste en MMKV. Un hook de autosave (throttled + `AppState`) guarda durante el juego; la pantalla ofrece Continuar/Nueva al entrar y limpia el save al game over.

**Tech Stack:** Expo SDK 54 · RN 0.81 · TypeScript estricto (`noUncheckedIndexedAccess`) · Zustand (react + vanilla) · Zod · react-native-mmkv 4 · Jest (ts-jest, node).

---

## Notas de ejecución (leer antes de empezar)

- **Commits:** el `CLAUDE.md` del proyecto pide **no commitear sin permiso explícito**. Los pasos de commit están incluidos por disciplina TDD, pero al ejecutar confirma con el usuario (o agrupa y pregunta). Todos los mensajes de commit deben terminar con el trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Sin rebuild nativo:** esta feature es JS puro + MMKV (ya presente en el dev build). No requiere `expo prebuild`.
- **Shell:** Windows + PowerShell. Los comandos de test son cross-shell (`npm`/`npx`).
- **Determinismo:** nada de `Math.random()`/`Date.now()` en `src/core/`. El timestamp del save entra como parámetro `now`.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/core/sudoku/progression.ts` | Modificar | Exportar `buildPuzzleSeed(runSeed, level)` (fuente única del seed por nivel). |
| `src/core/sudoku/index.ts` | Modificar | Reexportar `buildPuzzleSeed`. |
| `src/ui/SudokuGame/types.ts` | Modificar | Añadir `initialBoard`/`initialNotes`/`initialErrorIndices` a `SudokuGameOptions`. |
| `src/ui/SudokuGame/store.ts` | Modificar | Inicializar el store desde esas opciones (rehidratar tablero). |
| `src/features/sudoloco/save.ts` | Crear | **Puro**: `SavedRunSchema` (Zod), `serializeRun`, `deserializeRun`, tipos. |
| `src/features/sudoloco/save.storage.ts` | Crear | **IO**: `persistSave`, `loadSave`, `clearSave` sobre MMKV. |
| `src/features/sudoloco/useAutoSave.ts` | Crear | Hook: suscribe ambos stores (throttled) + `AppState` (pausa + save forzado). |
| `src/features/sudoloco/store.ts` | Modificar | Acción `restoreRun(restored)`. |
| `src/features/sudoloco/screen.tsx` | Modificar | Flujo Continuar/Nueva, construcción del game store (fresh vs restore), autosave, `clearSave()` al game over. |
| `jest.config.js` | Modificar | Añadir proyecto `unit` (ts-jest/node) para tests de `features/` y `ui/`. |
| `src/features/sudoloco/__tests__/save.test.ts` | Crear | Round-trip, determinismo, rechazo de saves corruptos. |
| `src/ui/SudokuGame/__tests__/store.restore.test.ts` | Crear | Rehidratación del game store desde opciones. |

**Refinamiento respecto al spec:** el `SavedRun` guarda **solo** los contadores de powerups *restantes* (`hintsRemaining`/`silverRemaining`/`goldenRemaining`, del game store), no los "otorgados" del run store. Al restaurar, el run store fija `hints = hintsRemaining`, etc., de modo que el efecto de sync existente (`diff = granted − remaining`) dé 0 y no re-otorgue powerups usados. Esto cumple el objetivo de coherencia del spec.

---

### Task 1: `buildPuzzleSeed` en core (fuente única del seed por nivel)

**Files:**
- Modify: `src/core/sudoku/progression.ts`
- Modify: `src/core/sudoku/index.ts`
- Modify: `src/features/sudoloco/store.ts` (usar el helper compartido)
- Test: `src/core/sudoku/__tests__/progression.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Añadir al final de `src/core/sudoku/__tests__/progression.test.ts`:

```ts
import { buildPuzzleSeed } from '@core/sudoku';

describe('buildPuzzleSeed', () => {
  it('combina runSeed y nivel de forma estable', () => {
    expect(buildPuzzleSeed('abc', 1)).toBe('abc:1');
    expect(buildPuzzleSeed('abc', 12)).toBe('abc:12');
  });

  it('es determinista para el mismo input', () => {
    expect(buildPuzzleSeed('xyz', 5)).toBe(buildPuzzleSeed('xyz', 5));
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx jest src/core/sudoku/__tests__/progression.test.ts -t buildPuzzleSeed`
Expected: FAIL — `buildPuzzleSeed is not a function` / no exportado.

- [ ] **Step 3: Implementar**

En `src/core/sudoku/progression.ts`, añadir al final:

```ts
export function buildPuzzleSeed(runSeed: string, level: number): string {
  return `${runSeed}:${level}`;
}
```

En `src/core/sudoku/index.ts`, cambiar la línea de progression para incluir el helper:

```ts
export { levelConfig, INITIAL_TIME_S, buildPuzzleSeed } from './progression';
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx jest src/core/sudoku/__tests__/progression.test.ts -t buildPuzzleSeed`
Expected: PASS.

- [ ] **Step 5: Reemplazar el `buildSeed` local en el run store**

En `src/features/sudoloco/store.ts`:

1. Cambiar el import de core (línea 2) para incluir `buildPuzzleSeed`:

```ts
import { createRng, generate, levelConfig, INITIAL_TIME_S, buildPuzzleSeed } from '@core/sudoku';
```

2. Borrar la función local:

```ts
function buildSeed(base: string, level: number): string {
  return `${base}:${level}`;
}
```

3. Sustituir sus dos usos: en `startRun` `buildSeed(runSeed, 1)` → `buildPuzzleSeed(runSeed, 1)`; en `nextLevel` `buildSeed(seed, nextLevel)` → `buildPuzzleSeed(seed, nextLevel)`.

- [ ] **Step 6: Verificar typecheck + tests core**

Run: `npm run typecheck` → sin errores.
Run: `npx jest src/core/sudoku/__tests__/progression.test.ts` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/sudoku/progression.ts src/core/sudoku/index.ts src/features/sudoloco/store.ts src/core/sudoku/__tests__/progression.test.ts
git commit -m "refactor(core): extract buildPuzzleSeed as shared level-seed helper"
```

---

### Task 2: Proyecto `unit` en Jest (habilitar tests de features/ui)

**Files:**
- Modify: `jest.config.js`

Actualmente `npm test` solo corre `core/` (el array `projects` excluye lo demás). Este proyecto añade un runner ts-jest/node para lógica pura de `features/` y `ui/`.

- [ ] **Step 1: Añadir el proyecto `unit`**

En `jest.config.js`, dentro del array `projects`, añadir un segundo objeto tras el de `core`:

```js
  projects: [
    {
      displayName: 'core',
      testMatch: ['<rootDir>/src/core/**/__tests__/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
      },
    },
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/features/**/__tests__/**/*.test.ts',
        '<rootDir>/src/ui/**/__tests__/**/*.test.ts',
      ],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@features/(.*)$': '<rootDir>/src/features/$1',
        '^@ui/(.*)$': '<rootDir>/src/ui/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@theme/(.*)$': '<rootDir>/src/theme/$1',
        '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
      },
    },
  ],
```

> Nota: los tests del proyecto `unit` deben mantenerse **libres de React Native** (solo lógica pura). No importar componentes RN ni módulos que carguen nativo.

- [ ] **Step 2: Verificar que el runner sigue verde y descubre el nuevo proyecto**

Run: `npx jest --listTests`
Expected: sigue listando los 8 tests de core (aún no hay tests unit; eso es correcto).

Run: `npm test`
Expected: los 61 tests de core siguen en PASS.

- [ ] **Step 3: Commit**

```bash
git add jest.config.js
git commit -m "test: add ts-jest 'unit' project for feature/ui pure logic"
```

---

### Task 3: Rehidratación del game store (`initialBoard`/`initialNotes`/`initialErrorIndices`)

**Files:**
- Modify: `src/ui/SudokuGame/types.ts`
- Modify: `src/ui/SudokuGame/store.ts:49-60`
- Test: `src/ui/SudokuGame/__tests__/store.restore.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/ui/SudokuGame/__tests__/store.restore.test.ts`:

```ts
import { createRng, generate } from '@core/sudoku';
import type { Board, CellValue } from '@core/sudoku';
import { createSudokuGameStore } from '@ui/SudokuGame';

function makeStore(overrides: Partial<Parameters<typeof createSudokuGameStore>[0]> = {}) {
  const puzzle = generate('beginner', 'restore-seed:1');
  const rng = createRng('restore-seed');
  return createSudokuGameStore({ puzzle, rng, ...overrides });
}

describe('createSudokuGameStore rehidratación', () => {
  it('sin initialBoard usa puzzle.initial', () => {
    const store = makeStore();
    const puzzle = generate('beginner', 'restore-seed:1');
    expect(store.getState().board).toEqual(puzzle.initial);
    expect(store.getState().isComplete).toBe(false);
  });

  it('con initialBoard rehidrata tablero, notas y errores', () => {
    const puzzle = generate('beginner', 'restore-seed:1');
    const board = [...puzzle.initial] as CellValue[];
    const emptyIdx = board.findIndex((v) => v === 0);
    board[emptyIdx] = 5 as CellValue;
    const notes = new Map<number, ReadonlySet<CellValue>>([[emptyIdx, new Set<CellValue>([1, 2])]]);
    const errorIndices = new Set<number>([emptyIdx]);

    const store = makeStore({
      initialBoard: board as unknown as Board,
      initialNotes: notes,
      initialErrorIndices: errorIndices,
      initialHints: 2,
    });

    expect(store.getState().board[emptyIdx]).toBe(5);
    expect([...(store.getState().notesByCell.get(emptyIdx) ?? [])]).toEqual([1, 2]);
    expect(store.getState().errorIndices.has(emptyIdx)).toBe(true);
    expect(store.getState().hintsRemaining).toBe(2);
    expect(store.getState().isComplete).toBe(false);
  });

  it('con initialBoard igual a la solución marca isComplete', () => {
    const puzzle = generate('beginner', 'restore-seed:1');
    const store = makeStore({ initialBoard: puzzle.solution });
    expect(store.getState().isComplete).toBe(true);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx jest src/ui/SudokuGame/__tests__/store.restore.test.ts`
Expected: FAIL — las opciones `initialBoard`/`initialNotes`/`initialErrorIndices` no existen (error de tipos) o el board no se rehidrata.

- [ ] **Step 3: Añadir las opciones al tipo**

En `src/ui/SudokuGame/types.ts`, actualizar imports y `SudokuGameOptions`:

```ts
import type { Board, CellValue, Puzzle } from '@core/sudoku';
import type { Rng } from '@core/sudoku';

export interface SudokuGameCallbacks {
  onCellCorrect?: (idx: number, value: CellValue) => void;
  onCellIncorrect?: (idx: number, value: CellValue) => void;
  onBoxComplete?: (boxIndex: number) => void;
  onPuzzleComplete?: () => void;
}

export interface SudokuGameOptions {
  puzzle: Puzzle;
  rng: Rng;
  initialHints?: number;
  initialSilverCells?: number;
  initialGoldenCells?: number;
  initialBoard?: Board;
  initialNotes?: ReadonlyMap<number, ReadonlySet<CellValue>>;
  initialErrorIndices?: ReadonlySet<number>;
  callbacks?: SudokuGameCallbacks;
}
```

- [ ] **Step 4: Inicializar el store desde las opciones**

En `src/ui/SudokuGame/store.ts`, reemplazar el bloque de estado inicial (líneas 50-60, desde `puzzle,` hasta `isComplete: false,`) por:

```ts
    puzzle,
    board: opts.initialBoard ?? puzzle.initial,
    selectedIndex: null,
    notesByCell: opts.initialNotes ?? new Map(),
    errorIndices: opts.initialErrorIndices ?? new Set(),
    hintsRemaining: opts.initialHints ?? 0,
    silverRemaining: opts.initialSilverCells ?? 0,
    goldenRemaining: opts.initialGoldenCells ?? 0,
    isGoldenMode: false,
    isNotesMode: false,
    isComplete: opts.initialBoard ? isBoardSolved(opts.initialBoard, puzzle.solution) : false,
```

(`isBoardSolved` ya está importado en el archivo.)

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `npx jest src/ui/SudokuGame/__tests__/store.restore.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/ui/SudokuGame/types.ts src/ui/SudokuGame/store.ts src/ui/SudokuGame/__tests__/store.restore.test.ts
git commit -m "feat(sudoku-engine): support rehydrating game store from saved board"
```

---

### Task 4: Módulo puro de save (`save.ts`)

**Files:**
- Create: `src/features/sudoloco/save.ts`
- Test: `src/features/sudoloco/__tests__/save.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/sudoloco/__tests__/save.test.ts`:

```ts
import { createRng, generate, buildPuzzleSeed } from '@core/sudoku';
import type { Board, CellValue } from '@core/sudoku';
import {
  SavedRunSchema,
  serializeRun,
  deserializeRun,
  SAVE_VERSION,
} from '@features/sudoloco/save';

function sampleParams() {
  const seed = 'seed-123';
  const level = 4;
  const puzzle = generate('intermediate', buildPuzzleSeed(seed, level));
  const board = [...puzzle.initial] as CellValue[];
  const emptyIdx = board.findIndex((v) => v === 0);
  board[emptyIdx] = 7 as CellValue;
  return {
    seed,
    level,
    emptyIdx,
    params: {
      run: {
        seed,
        level,
        lives: 2,
        crystalHearts: 1,
        timeRemaining: 143,
        score: 1250,
      },
      game: {
        board: board as unknown as Board,
        notesByCell: new Map<number, ReadonlySet<CellValue>>([
          [emptyIdx, new Set<CellValue>([3, 4])],
        ]),
        errorIndices: new Set<number>([emptyIdx]),
        hintsRemaining: 1,
        silverRemaining: 0,
        goldenRemaining: 2,
      },
    },
  };
}

describe('serializeRun / deserializeRun', () => {
  it('produce un SavedRun válido según el schema', () => {
    const { params } = sampleParams();
    const saved = serializeRun(params, 1_700_000_000_000);
    expect(saved.version).toBe(SAVE_VERSION);
    expect(saved.savedAt).toBe(1_700_000_000_000);
    expect(SavedRunSchema.safeParse(saved).success).toBe(true);
  });

  it('round-trip preserva meta, tablero, notas, errores y powerups restantes', () => {
    const { params, emptyIdx } = sampleParams();
    const saved = serializeRun(params, 1);
    const restored = deserializeRun(saved);

    expect(restored.level).toBe(4);
    expect(restored.lives).toBe(2);
    expect(restored.crystalHearts).toBe(1);
    expect(restored.timeRemaining).toBe(143);
    expect(restored.score).toBe(1250);
    expect(restored.board[emptyIdx]).toBe(7);
    expect([...(restored.notesByCell.get(emptyIdx) ?? [])]).toEqual([3, 4]);
    expect(restored.errorIndices.has(emptyIdx)).toBe(true);
    expect(restored.hintsRemaining).toBe(1);
    expect(restored.silverRemaining).toBe(0);
    expect(restored.goldenRemaining).toBe(2);
  });

  it('regenera el mismo puzzle determinista (initial + solution)', () => {
    const { params, seed, level } = sampleParams();
    const saved = serializeRun(params, 1);
    const restored = deserializeRun(saved);
    const expected = generate('intermediate', buildPuzzleSeed(seed, level));
    expect(restored.puzzle.initial).toEqual(expected.initial);
    expect(restored.puzzle.solution).toEqual(expected.solution);
  });

  it('el schema rechaza versión desconocida', () => {
    const { params } = sampleParams();
    const saved = serializeRun(params, 1);
    const bad = { ...saved, version: 99 };
    expect(SavedRunSchema.safeParse(bad).success).toBe(false);
  });

  it('el schema rechaza un tablero de longitud incorrecta', () => {
    const { params } = sampleParams();
    const saved = serializeRun(params, 1);
    const bad = { ...saved, board: saved.board.slice(0, 80) };
    expect(SavedRunSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx jest src/features/sudoloco/__tests__/save.test.ts`
Expected: FAIL — no existe `@features/sudoloco/save`.

- [ ] **Step 3: Implementar `save.ts`**

Crear `src/features/sudoloco/save.ts`:

```ts
import { z } from 'zod';
import { createRng, generate, levelConfig, buildPuzzleSeed } from '@core/sudoku';
import type { Board, CellValue, Puzzle, Rng } from '@core/sudoku';

export const SAVE_VERSION = 1 as const;

const cellValueSchema = z.number().int().min(0).max(9);
const noteValueSchema = z.number().int().min(1).max(9);
const cellIndexSchema = z.number().int().min(0).max(80);

export const SavedRunSchema = z.object({
  version: z.literal(SAVE_VERSION),
  savedAt: z.number(),
  seed: z.string(),
  level: z.number().int().min(1),
  lives: z.number().int(),
  crystalHearts: z.number().int().min(0),
  timeRemaining: z.number(),
  score: z.number().int().min(0),
  board: z.array(cellValueSchema).length(81),
  notes: z.array(z.tuple([cellIndexSchema, z.array(noteValueSchema)])),
  errorIndices: z.array(cellIndexSchema),
  hintsRemaining: z.number().int().min(0),
  silverRemaining: z.number().int().min(0),
  goldenRemaining: z.number().int().min(0),
});

export type SavedRun = z.infer<typeof SavedRunSchema>;

export interface SerializeParams {
  run: {
    seed: string;
    level: number;
    lives: number;
    crystalHearts: number;
    timeRemaining: number;
    score: number;
  };
  game: {
    board: Board;
    notesByCell: ReadonlyMap<number, ReadonlySet<CellValue>>;
    errorIndices: ReadonlySet<number>;
    hintsRemaining: number;
    silverRemaining: number;
    goldenRemaining: number;
  };
}

export interface RestoredRun {
  seed: string;
  level: number;
  lives: number;
  crystalHearts: number;
  timeRemaining: number;
  score: number;
  puzzle: Puzzle;
  rng: Rng;
  board: Board;
  notesByCell: Map<number, Set<CellValue>>;
  errorIndices: Set<number>;
  hintsRemaining: number;
  silverRemaining: number;
  goldenRemaining: number;
}

export function serializeRun(params: SerializeParams, now: number): SavedRun {
  const { run, game } = params;
  const notes: [number, number[]][] = [];
  for (const [idx, set] of game.notesByCell) {
    if (set.size > 0) notes.push([idx, [...set]]);
  }
  return {
    version: SAVE_VERSION,
    savedAt: now,
    seed: run.seed,
    level: run.level,
    lives: run.lives,
    crystalHearts: run.crystalHearts,
    timeRemaining: run.timeRemaining,
    score: run.score,
    board: [...game.board],
    notes,
    errorIndices: [...game.errorIndices],
    hintsRemaining: game.hintsRemaining,
    silverRemaining: game.silverRemaining,
    goldenRemaining: game.goldenRemaining,
  };
}

export function deserializeRun(saved: SavedRun): RestoredRun {
  const { difficulty } = levelConfig(saved.level);
  const puzzle = generate(difficulty, buildPuzzleSeed(saved.seed, saved.level));
  const rng = createRng(saved.seed);

  const notesByCell = new Map<number, Set<CellValue>>();
  for (const [idx, values] of saved.notes) {
    notesByCell.set(idx, new Set(values as CellValue[]));
  }

  return {
    seed: saved.seed,
    level: saved.level,
    lives: saved.lives,
    crystalHearts: saved.crystalHearts,
    timeRemaining: saved.timeRemaining,
    score: saved.score,
    puzzle,
    rng,
    board: saved.board as unknown as Board,
    notesByCell,
    errorIndices: new Set(saved.errorIndices),
    hintsRemaining: saved.hintsRemaining,
    silverRemaining: saved.silverRemaining,
    goldenRemaining: saved.goldenRemaining,
  };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx jest src/features/sudoloco/__tests__/save.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/features/sudoloco/save.ts src/features/sudoloco/__tests__/save.test.ts
git commit -m "feat(sudoloco): pure serialize/deserialize for run save state"
```

---

### Task 5: Wrapper de IO sobre MMKV (`save.storage.ts`)

**Files:**
- Create: `src/features/sudoloco/save.storage.ts`

No lleva test unitario: es un wrapper fino sobre MMKV (nativo, no corre en node). Se valida por typecheck y por la verificación manual del Task 8.

- [ ] **Step 1: Implementar `save.storage.ts`**

Crear `src/features/sudoloco/save.storage.ts`:

```ts
import { storage, StorageKeys } from '@services/storage/mmkv';
import { SavedRunSchema, type SavedRun } from './save';

export function persistSave(saved: SavedRun): void {
  try {
    storage.set(StorageKeys.inProgressGame, JSON.stringify(saved));
  } catch (e) {
    console.warn('[sudoloco] persistSave failed', e);
  }
}

export function loadSave(): SavedRun | null {
  const raw = storage.getString(StorageKeys.inProgressGame);
  if (!raw) return null;
  try {
    const parsed = SavedRunSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      storage.remove(StorageKeys.inProgressGame);
      return null;
    }
    return parsed.data;
  } catch {
    storage.remove(StorageKeys.inProgressGame);
    return null;
  }
}

export function clearSave(): void {
  storage.remove(StorageKeys.inProgressGame);
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores. (Confirma que `storage.set/getString/remove` existen en react-native-mmkv 4.)

- [ ] **Step 3: Commit**

```bash
git add src/features/sudoloco/save.storage.ts
git commit -m "feat(sudoloco): MMKV persistence wrapper for saved run"
```

---

### Task 6: Acción `restoreRun` en el run store

**Files:**
- Modify: `src/features/sudoloco/store.ts`

- [ ] **Step 1: Importar el tipo `RestoredRun`**

En `src/features/sudoloco/store.ts`, tras los imports de core existentes, añadir:

```ts
import type { RestoredRun } from './save';
```

- [ ] **Step 2: Declarar la acción en la interfaz `RunActions`**

En la interfaz `RunActions`, añadir tras `startRun(seed?: string): void;`:

```ts
  restoreRun(restored: RestoredRun): void;
```

- [ ] **Step 3: Implementar la acción**

En el objeto del store, justo después de la acción `startRun(seed) { ... },`, añadir:

```ts
  restoreRun(r) {
    set({
      phase: 'playing',
      previousPhase: 'idle',
      level: r.level,
      lives: r.lives,
      crystalHearts: r.crystalHearts,
      timeRemaining: r.timeRemaining,
      score: r.score,
      // El run store solo usa estos contadores para sincronizar con el game
      // store (diff = otorgados − restantes). Fijarlos a los restantes evita
      // re-otorgar powerups ya usados al reanudar.
      hints: r.hintsRemaining,
      silverCells: r.silverRemaining,
      goldenCells: r.goldenRemaining,
      coinsEarned: 0,
      seed: r.seed,
      puzzle: r.puzzle,
      rng: r.rng,
    });
  },
```

- [ ] **Step 4: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/features/sudoloco/store.ts
git commit -m "feat(sudoloco): add restoreRun action to rehydrate run state"
```

---

### Task 7: Hook de autosave (`useAutoSave.ts`)

**Files:**
- Create: `src/features/sudoloco/useAutoSave.ts`

- [ ] **Step 1: Implementar el hook**

Crear `src/features/sudoloco/useAutoSave.ts`:

```ts
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { SudokuGameStore } from '@ui/SudokuGame';
import { useSudolocoStore } from './store';
import { serializeRun } from './save';
import { persistSave } from './save.storage';

const SAVEABLE_PHASES = new Set(['playing', 'paused', 'microgame', 'between_levels']);
const THROTTLE_MS = 2000;

export function useAutoSave(gameStore: SudokuGameStore | null): void {
  const lastSaveRef = useRef(0);

  useEffect(() => {
    if (!gameStore) return;

    const snapshot = () => {
      const run = useSudolocoStore.getState();
      if (!SAVEABLE_PHASES.has(run.phase)) return;
      const game = gameStore.getState();
      persistSave(
        serializeRun(
          {
            run: {
              seed: run.seed,
              level: run.level,
              lives: run.lives,
              crystalHearts: run.crystalHearts,
              timeRemaining: run.timeRemaining,
              score: run.score,
            },
            game: {
              board: game.board,
              notesByCell: game.notesByCell,
              errorIndices: game.errorIndices,
              hintsRemaining: game.hintsRemaining,
              silverRemaining: game.silverRemaining,
              goldenRemaining: game.goldenRemaining,
            },
          },
          Date.now(),
        ),
      );
    };

    const throttledSave = () => {
      const now = Date.now();
      if (now - lastSaveRef.current < THROTTLE_MS) return;
      lastSaveRef.current = now;
      snapshot();
    };

    const unsubRun = useSudolocoStore.subscribe(throttledSave);
    const unsubGame = gameStore.subscribe(throttledSave);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        useSudolocoStore.getState().pauseRun();
        lastSaveRef.current = Date.now();
        snapshot(); // guardado forzado inmediato: captura el timer exacto
      }
    });

    return () => {
      unsubRun();
      unsubGame();
      sub.remove();
    };
  }, [gameStore]);
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/sudoloco/useAutoSave.ts
git commit -m "feat(sudoloco): auto-save hook (throttled + AppState background)"
```

---

### Task 8: Cablear pantalla — Continuar/Nueva, autosave y `clearSave` al game over

**Files:**
- Modify: `src/features/sudoloco/screen.tsx`

Reescritura de la pantalla para: (1) al montar, cargar el save y ofrecer Continuar/Nueva; (2) construir el game store fresco o restaurado; (3) enganchar el autosave; (4) borrar el save al game over.

- [ ] **Step 1: Reemplazar el contenido completo de `src/features/sudoloco/screen.tsx`**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSudolocoStore } from './store';
import { LivesDisplay, TimerDisplay, ScoreDisplay } from './ui/HUD';
import { SudokuGame } from '@ui/SudokuGame';
import { createSudokuGameStore } from '@ui/SudokuGame';
import type { SudokuGameStore } from '@ui/SudokuGame';
import { numbersPack } from '@core/symbols';
import { rollReward } from '@core/sudoku';
import type { Reward } from '@core/sudoku';
import { colors } from '@theme/colors';
import { useAuthStore } from '@features/auth';
import { useQueryClient } from '@tanstack/react-query';
import { updateHighscoreIfBetter, addCoins } from '@services/firebase/users.repo';
import { userKeys } from '@features/auth';
import { loadSave, clearSave } from './save.storage';
import { deserializeRun, type SavedRun, type RestoredRun } from './save';
import { useAutoSave } from './useAutoSave';

export function SudolocoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const {
    phase, level, lives, crystalHearts, timeRemaining, score,
    hints, silverCells, goldenCells, coinsEarned, puzzle, rng,
    startRun, restoreRun, onCellCorrect, onCellIncorrect, onBoxComplete,
    onPuzzleComplete, tick, nextLevel, exitMicrogame, grantReward,
    resetRun, pauseRun, resumeRun,
  } = useSudolocoStore();

  // undefined = aún no revisado; null = revisado, sin save; SavedRun = hay save.
  const [pendingSave, setPendingSave] = useState<SavedRun | null | undefined>(undefined);
  const [gameStore, setGameStore] = useState<SudokuGameStore | null>(null);
  const restoreDataRef = useRef<RestoredRun | null>(null);

  useAutoSave(gameStore);

  // Al montar: cargar save. Si hay, esperar decisión del usuario; si no, iniciar.
  useEffect(() => {
    if (phase !== 'idle') return;
    const save = loadSave();
    setPendingSave(save);
    if (!save) startRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Construir el game store cuando cambia el puzzle (inicio, nextLevel o restore).
  useEffect(() => {
    if (!puzzle || !rng) return;
    const restore = restoreDataRef.current;
    restoreDataRef.current = null;
    const store = createSudokuGameStore({
      puzzle,
      rng,
      initialHints: restore ? restore.hintsRemaining : hints,
      initialSilverCells: restore ? restore.silverRemaining : silverCells,
      initialGoldenCells: restore ? restore.goldenRemaining : goldenCells,
      initialBoard: restore?.board,
      initialNotes: restore?.notesByCell,
      initialErrorIndices: restore?.errorIndices,
      callbacks: {
        onCellCorrect: (idx) => onCellCorrect(idx),
        onCellIncorrect: () => onCellIncorrect(),
        onBoxComplete: (boxIdx) => onBoxComplete(boxIdx),
        onPuzzleComplete: () => onPuzzleComplete(),
      },
    });
    setGameStore(store);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle]);

  // Persistir highscore + monedas y limpiar el save al terminar la run.
  const savedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'gameover' || savedRef.current) return;
    savedRef.current = true;
    clearSave();
    if (!user) return;
    Promise.all([
      updateHighscoreIfBetter(user.uid, score),
      addCoins(user.uid, coinsEarned),
    ])
      .then(() => {
        qc.invalidateQueries({ queryKey: userKeys.profile(user.uid) });
      })
      .catch(console.warn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && level === 1) savedRef.current = false;
  }, [phase, level]);

  // Sync power-ups otorgados mid-run hacia el game store.
  useEffect(() => {
    if (!gameStore) return;
    const diff = hints - gameStore.getState().hintsRemaining;
    if (diff > 0) gameStore.getState().grantHints(diff);
  }, [hints, gameStore]);

  useEffect(() => {
    if (!gameStore) return;
    const diff = silverCells - gameStore.getState().silverRemaining;
    if (diff > 0) gameStore.getState().grantSilverCells(diff);
  }, [silverCells, gameStore]);

  useEffect(() => {
    if (!gameStore) return;
    const diff = goldenCells - gameStore.getState().goldenRemaining;
    if (diff > 0) gameStore.getState().grantGoldenCells(diff);
  }, [goldenCells, gameStore]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [phase, tick]);

  const [microgameReward, setMicrogameReward] = useState<Reward | null>(null);
  useEffect(() => {
    if (phase === 'microgame' && rng) {
      setMicrogameReward(rollReward(level, rng));
    } else {
      setMicrogameReward(null);
    }
  }, [phase, rng, level]);

  void router;

  const handleContinue = () => {
    if (!pendingSave) return;
    const restored = deserializeRun(pendingSave);
    restoreDataRef.current = restored;
    setPendingSave(null);
    restoreRun(restored);
  };

  const handleNewGame = () => {
    clearSave();
    setPendingSave(null);
    startRun();
  };

  // Pantalla de reanudación (hay save y aún no se decidió).
  if (phase === 'idle') {
    if (pendingSave) {
      return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <Text style={styles.title}>Partida en curso</Text>
            <Text style={styles.finalScore}>Nivel {pendingSave.level}</Text>
            <Text style={styles.finalScore}>Score: {pendingSave.score.toLocaleString()}</Text>
            <Pressable style={styles.startBtn} onPress={handleContinue}>
              <Text style={styles.startBtnText}>Continuar</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={handleNewGame}>
              <Text style={styles.secondaryBtnText}>Empezar de nuevo</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return null;
  }

  if (phase === 'gameover') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.gameoverTitle}>Game Over</Text>
          <Text style={styles.finalScore}>Score: {score.toLocaleString()}</Text>
          <Text style={styles.finalScore}>Nivel: {level}</Text>
          <Text style={styles.coins}>+{coinsEarned} monedas</Text>
          <Pressable style={styles.startBtn} onPress={() => resetRun()}>
            <Text style={styles.startBtnText}>Volver al menú</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'between_levels') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.title}>¡Nivel {level} completado!</Text>
          <Text style={styles.bonusText}>+60 segundos</Text>
          <Pressable style={styles.startBtn} onPress={() => nextLevel()}>
            <Text style={styles.startBtnText}>Siguiente nivel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!gameStore) return null;

  const urgency = Math.max(0, Math.min(1, (30 - timeRemaining) / 30));

  return (
    <View style={styles.safe}>
      <SudokuGame
        store={gameStore}
        pack={numbersPack}
        showHintButton={hints > 0}
        showSilverButton={silverCells > 0}
        showGoldenButton={goldenCells > 0}
        template={{ backgroundId: 'base', urgency, paused: phase !== 'playing' }}
      />

      <View style={[styles.hud, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <LivesDisplay lives={lives} crystalHearts={crystalHearts} />
        <TimerDisplay timeRemaining={timeRemaining} />
        <View style={styles.hudRight}>
          <Pressable onPress={pauseRun} style={styles.pauseBtn}>
            <Text style={styles.pauseIcon}>⏸️</Text>
          </Pressable>
          <ScoreDisplay score={score} level={level} />
        </View>
      </View>

      {phase === 'paused' && (
        <View style={styles.overlay} pointerEvents="auto">
          <Text style={styles.overlayTitle}>⏸️ Pausa</Text>
          <Pressable style={styles.startBtn} onPress={resumeRun}>
            <Text style={styles.startBtnText}>Continuar</Text>
          </Pressable>
        </View>
      )}

      {phase === 'microgame' && (
        <View style={styles.overlay} pointerEvents="auto">
          <Text style={styles.overlayTitle}>¡Microjuego!</Text>
          <Text style={styles.bonusText}>⏱️ Tiempo bonus garantizado</Text>
          {microgameReward && (
            <Text style={styles.rewardText}>{rewardLabel(microgameReward)}</Text>
          )}
          <Pressable
            style={styles.startBtn}
            onPress={() => {
              grantReward({ kind: 'time_boost' });
              if (microgameReward) grantReward(microgameReward);
              exitMicrogame();
            }}
          >
            <Text style={styles.startBtnText}>Continuar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.base },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pauseBtn: { padding: 4 },
  pauseIcon: { fontSize: 20 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
    gap: 20,
  },
  title: { fontSize: 32, fontWeight: '900', color: colors.text.primary, letterSpacing: 2 },
  gameoverTitle: { fontSize: 40, fontWeight: '900', color: colors.state.danger },
  finalScore: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  coins: { fontSize: 18, fontWeight: '600', color: colors.brand.accent },
  bonusText: { fontSize: 18, fontWeight: '600', color: colors.state.success },
  startBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brand.primary,
  },
  startBtnText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  secondaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brand.primary,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: colors.brand.primary },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  overlayTitle: { fontSize: 28, fontWeight: '900', color: colors.text.primary },
  rewardText: { fontSize: 22, fontWeight: '700', color: colors.brand.accent },
});

function rewardLabel(reward: Reward): string {
  switch (reward.kind) {
    case 'time_boost': return '⏱️ ¡Tiempo bonus!';
    case 'hint': return '🔍 ¡Una pista!';
    case 'silver_cell': return '🥈 ¡Casilla plateada!';
    case 'golden_cell': return '🥇 ¡Casilla dorada!';
    case 'life': return '♥ ¡Vida extra!';
    case 'crystal_heart': return '◇ ¡Corazón de cristal!';
    case 'none': return '';
  }
}
```

- [ ] **Step 2: Verificar typecheck y lint**

Run: `npm run typecheck`
Expected: sin errores.
Run: `npx eslint src/features/sudoloco/screen.tsx src/features/sudoloco/useAutoSave.ts src/features/sudoloco/save.storage.ts`
Expected: exit 0 (solo el warning de package.json module-type es aceptable).

- [ ] **Step 3: Commit**

```bash
git add src/features/sudoloco/screen.tsx
git commit -m "feat(sudoloco): resume prompt, autosave wiring, clear save on game over"
```

---

### Task 9: Verificación integral

**Files:** ninguno (verificación).

- [ ] **Step 1: Suite completa de tests**

Run: `npm test`
Expected: proyecto `core` (61 tests) + proyecto `unit` (save.test.ts 5 + store.restore.test.ts 3) en PASS.

- [ ] **Step 2: Typecheck y lint globales**

Run: `npm run typecheck` → sin errores.
Run: `npm run lint` → sin errores nuevos.

- [ ] **Step 3: Verificación manual en el emulador Android**

Usar el skill `verify` / `run` para lanzar la app y comprobar el flujo end-to-end:

1. Entrar a Sudoloco → empieza partida nueva (no había save).
2. Colocar algunas celdas (score sube), avanzar de nivel.
3. Mandar la app a segundo plano (home del sistema) → volver: debe estar en **Pausa** (timer congelado en el valor previo).
4. **Cerrar la app por completo** y reabrir → entrar a Sudoloco: aparece **"Partida en curso — Nivel X · Score Y"**.
5. **Continuar** → el tablero reaparece con las celdas puestas, notas, errores, vidas, timer y score exactos; los powerups no se re-otorgan.
6. **Empezar de nuevo** (en otra corrida) → descarta el save y arranca limpio.
7. Provocar game over → verifica `+monedas`, y que al reabrir **ya no** ofrece reanudar (save borrado).
8. Con sesión iniciada, confirmar en Firebase que `stats.highscore` y `wallet.coins` se actualizaron tras el game over.

- [ ] **Step 4: Commit final (si hubo ajustes de verificación)**

```bash
git add -A
git commit -m "test(sudoloco): verify save/resume flow end-to-end"
```

---

## Self-Review (cobertura del spec)

- **Save exacto celda por celda** → Tasks 3 (rehidratación store), 4 (serialize board/notes/errors), 8 (wiring). ✅
- **Autosave automático** → Task 7 (throttled + subscribe a ambos stores). ✅
- **Auto-pausa + timer congelado en background** → Task 7 (`AppState` → `pauseRun` + save forzado); el timer solo corre en `playing` (screen). ✅
- **Prompt Continuar/Nueva** → Task 8 (pantalla `phase==='idle' && pendingSave`). ✅
- **Puzzle determinista regenerado** → Tasks 1 (`buildPuzzleSeed`), 4 (`deserializeRun` + test de determinismo). ✅
- **Score/monedas sin cambios de fórmula** → no se toca `economy.ts` ni `onCellCorrect`/`onPuzzleComplete`; solo se persiste/restaura `score`. ✅
- **Coherencia (sin doble conteo)** → Task 6 (`hints := hintsRemaining` evita re-otorgar) + Task 8 (`clearSave()` + guard `savedRef` en game over). ✅
- **Firebase highscore + monedas al terminar** → Task 8 (efecto de game over: `updateHighscoreIfBetter` + `addCoins` + `clearSave`). ✅
- **Save corrupto/versión desconocida → null** → Tasks 4 (schema `z.literal(SAVE_VERSION)` + `length(81)`), 5 (`loadSave` descarta y devuelve null). ✅
- **Tests** → Tasks 2 (runner), 3, 4. ✅

Sin placeholders. Nombres consistentes entre tareas (`buildPuzzleSeed`, `serializeRun`/`deserializeRun`, `RestoredRun`, `persistSave`/`loadSave`/`clearSave`, `restoreRun`, `useAutoSave`, opciones `initialBoard`/`initialNotes`/`initialErrorIndices`).
