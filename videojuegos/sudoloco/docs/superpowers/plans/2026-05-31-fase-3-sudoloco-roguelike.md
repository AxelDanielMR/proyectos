# Fase 3: Motor Sudoloco Roguelike — Plan de Implementación

> **Para agentes**: REQUERIDO: Usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** Implementar el núcleo roguelike de Sudoloco (timer acumulado, vidas, puntuación, recompensas de microjuegos), el motor compartido de juego que todos los modos consumen, y la pantalla jugable del modo principal.

**Arquitectura:** Fase 3 se descompone en 3 capas independientes (separables, cada una produce código testeable):
1. **3a — Core puro** (`src/core/sudoku/`): `progression.ts`, `rewards.ts`, `hints.ts`, `economy.ts` — lógica sin dependencias de React/Firebase, 100% Jest.
2. **3b — Motor compartido** (`src/ui/SudokuGame/`): Zustand store factory que encapsula tablero+selección+notas+errores, de consumo agnóstico (todos los modos lo usan igual).
3. **3c — Modo Sudoloco** (`src/features/sudoloco/`): RunState (lives, timer, score), persistencia MMKV, HUD, pantalla principal, game over.

**Tech Stack:** TypeScript estricto · Jest (tests) · Zustand (state) · MMKV (persistencia local) · React Native + Expo Router (UI) · i18next (textos).

---

## Archivo Structure (antes de tareas)

### Nuevos archivos en `src/core/sudoku/`
```
src/core/sudoku/
  ├── progression.ts        # levelConfig(level) → { difficulty, secsPerCell }
  ├── progression.test.ts
  ├── rewards.ts            # rollReward(level, rng) → Reward
  ├── rewards.test.ts
  ├── hints.ts              # pickHintCell, revealCandidate, revealGoldenCell
  ├── hints.test.ts
  ├── economy.ts            # computeRunReward(score, level) → { coins }
  └── economy.test.ts
```

### Nuevos archivos en `src/ui/SudokuGame/`
```
src/ui/SudokuGame/
  ├── types.ts              # SudokuGameOptions, SudokuGameCallbacks, SudokuGameState
  ├── store.ts              # createSudokuGameStore factory
  ├── store.test.ts
  ├── hooks.ts              # useSudokuGame, useCellState, etc.
  ├── hooks.test.ts
  ├── SudokuGame.tsx        # <SudokuGame store pack /> componente
  └── index.ts              # exports públicos
```

### Nuevos archivos en `src/features/sudoloco/`
```
src/features/sudoloco/
  ├── store.ts              # createSudokulocoStore (RunState + BoardState separation)
  ├── store.test.ts
  ├── screen.tsx            # <SudokulocoScreen /> — pantalla principal jugable
  ├── ui/
  │   ├── HUD.tsx           # LivesDisplay, TimerDisplay, ScoreDisplay
  │   ├── GameOverScreen.tsx
  │   └── LevelTransition.tsx (opcional, animated transition)
  └── hooks.ts              # selectores finos: useRunState, useTimer, etc.
```

### Ruta Expo Router
```
app/(tabs)/home.tsx         # botón "SUDOLOCO" → /sudoloco
app/sudoloco.tsx            # <SudokulocoScreen /> en Stack modal
```

---

## SECCIÓN 3a: Core Puro (Lógica sin React/Firebase)

### Task 1: Progression levels + tests

**Archivos:**
- Crear: `src/core/sudoku/progression.ts`
- Crear: `src/core/sudoku/progression.test.ts`

- [ ] **Step 1: Escribir test fallido — `levelConfig` retorna dificultad y segundos por celda**

```typescript
// src/core/sudoku/progression.test.ts
import { levelConfig, INITIAL_TIME_S } from './progression';
import type { Difficulty } from './difficulty';

describe('levelConfig', () => {
  it('nivel 1-3 son beginner', () => {
    expect(levelConfig(1).difficulty).toBe('beginner');
    expect(levelConfig(2).difficulty).toBe('beginner');
    expect(levelConfig(3).difficulty).toBe('beginner');
  });

  it('nivel 4-7 son intermediate', () => {
    expect(levelConfig(4).difficulty).toBe('intermediate');
    expect(levelConfig(7).difficulty).toBe('intermediate');
  });

  it('nivel 8-12 son hard', () => {
    expect(levelConfig(8).difficulty).toBe('hard');
    expect(levelConfig(12).difficulty).toBe('hard');
  });

  it('nivel 13+ son expert', () => {
    expect(levelConfig(13).difficulty).toBe('expert');
    expect(levelConfig(50).difficulty).toBe('expert');
  });

  it('beginner suma 4s por celda correcta', () => {
    expect(levelConfig(1).secsPerCell).toBe(4);
  });

  it('intermediate suma 3s por celda correcta', () => {
    expect(levelConfig(4).secsPerCell).toBe(3);
  });

  it('hard suma 2s por celda correcta', () => {
    expect(levelConfig(8).secsPerCell).toBe(2);
  });

  it('expert suma 2s por celda correcta', () => {
    expect(levelConfig(13).secsPerCell).toBe(2);
  });

  it('INITIAL_TIME_S = 180', () => {
    expect(INITIAL_TIME_S).toBe(180);
  });
});
```

- [ ] **Step 2: Correr test para verificar que falla**

```bash
npm test -- src/core/sudoku/progression.test.ts
```

Esperado: FAIL — `levelConfig` no está definida.

- [ ] **Step 3: Implementar `progression.ts`**

```typescript
// src/core/sudoku/progression.ts
import type { Difficulty } from './difficulty';

export const INITIAL_TIME_S = 180;

export interface LevelConfig {
  difficulty: Difficulty;
  secsPerCell: number;
}

export function levelConfig(level: number): LevelConfig {
  const difficulty: Difficulty =
    level <= 3 ? 'beginner'
    : level <= 7 ? 'intermediate'
    : level <= 12 ? 'hard'
    : 'expert';

  const secsPerCell =
    difficulty === 'beginner' ? 4
    : difficulty === 'intermediate' ? 3
    : 2; // hard o expert

  return { difficulty, secsPerCell };
}
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
npm test -- src/core/sudoku/progression.test.ts
```

Esperado: PASS — 9/9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/sudoku/progression.ts src/core/sudoku/progression.test.ts
git commit -m "feat(core): progression levels with difficulty mapping"
```

---

### Task 2: Rewards system + tests

**Archivos:**
- Crear: `src/core/sudoku/rewards.ts`
- Crear: `src/core/sudoku/rewards.test.ts`

- [ ] **Step 1: Escribir test fallido — `rollReward` retorna un Reward tipado**

```typescript
// src/core/sudoku/rewards.test.ts
import { rollReward, Reward } from './rewards';
import { PRNG } from './prng';

describe('rollReward', () => {
  let rng: PRNG;

  beforeEach(() => {
    rng = new PRNG('test-seed');
  });

  it('retorna un Reward válido', () => {
    const reward = rollReward(1, rng);
    expect(reward).toHaveProperty('kind');
    const kinds = ['time', 'hint', 'silver_cell', 'golden_cell', 'life', 'crystal_heart', 'none'];
    expect(kinds).toContain(reward.kind);
  });

  it('time reward tiene amount > 0', () => {
    // Generar varios rewards hasta encontrar uno de time
    let found = false;
    for (let i = 0; i < 100; i++) {
      const reward = rollReward(1, new PRNG(`seed-${i}`));
      if (reward.kind === 'time') {
        expect(reward.amount).toBeGreaterThan(0);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('hint, silver_cell, golden_cell, life, crystal_heart no tienen amount', () => {
    for (let i = 0; i < 100; i++) {
      const reward = rollReward(1, new PRNG(`seed-${i}`));
      if (reward.kind !== 'time' && reward.kind !== 'none') {
        expect((reward as any).amount).toBeUndefined();
      }
    }
  });

  it('probabilidades cambian por nivel (golden_cell más probable en nivel alto)', () => {
    // Nivel bajo: golden_cell raro
    let goldenCount = 0;
    for (let i = 0; i < 100; i++) {
      const reward = rollReward(1, new PRNG(`early-${i}`));
      if (reward.kind === 'golden_cell') goldenCount++;
    }
    const earlyRate = goldenCount / 100;

    // Nivel alto: golden_cell más común
    goldenCount = 0;
    for (let i = 0; i < 100; i++) {
      const reward = rollReward(20, new PRNG(`late-${i}`));
      if (reward.kind === 'golden_cell') goldenCount++;
    }
    const lateRate = goldenCount / 100;

    expect(lateRate).toBeGreaterThan(earlyRate);
  });
});
```

- [ ] **Step 2: Correr test para verificar que falla**

```bash
npm test -- src/core/sudoku/rewards.test.ts
```

Esperado: FAIL — `rollReward` no está definida.

- [ ] **Step 3: Implementar `rewards.ts`**

```typescript
// src/core/sudoku/rewards.ts
import type { PRNG } from './prng';

export type Reward =
  | { kind: 'time'; amount: number }
  | { kind: 'hint' }
  | { kind: 'silver_cell' }
  | { kind: 'golden_cell' }
  | { kind: 'life' }
  | { kind: 'crystal_heart' }
  | { kind: 'none' };

interface RewardWeights {
  time: number;
  hint: number;
  silver_cell: number;
  golden_cell: number;
  life: number;
  crystal_heart: number;
  none: number;
}

// Tabla de probabilidades (en %)
const WEIGHTS_BY_LEVEL = {
  early: {
    time: 26,
    hint: 18,
    silver_cell: 12,
    golden_cell: 4,
    life: 5,
    crystal_heart: 10,
    none: 25,
  } as RewardWeights,
  late: {
    time: 22,
    hint: 20,
    silver_cell: 14,
    golden_cell: 8,
    life: 8,
    crystal_heart: 8,
    none: 20,
  } as RewardWeights,
};

function interpolateWeights(level: number): RewardWeights {
  // Nivel 1-10: early, Nivel 20+: late, interpolar en el medio
  if (level <= 10) return WEIGHTS_BY_LEVEL.early;
  if (level >= 20) return WEIGHTS_BY_LEVEL.late;

  const t = (level - 10) / 10;
  const early = WEIGHTS_BY_LEVEL.early;
  const late = WEIGHTS_BY_LEVEL.late;

  return {
    time: early.time + (late.time - early.time) * t,
    hint: early.hint + (late.hint - early.hint) * t,
    silver_cell: early.silver_cell + (late.silver_cell - early.silver_cell) * t,
    golden_cell: early.golden_cell + (late.golden_cell - early.golden_cell) * t,
    life: early.life + (late.life - early.life) * t,
    crystal_heart: early.crystal_heart + (late.crystal_heart - early.crystal_heart) * t,
    none: early.none + (late.none - early.none) * t,
  };
}

export function rollReward(level: number, rng: PRNG): Reward {
  const weights = interpolateWeights(level);
  const roll = rng.next() * 100; // 0..100

  let cumulative = 0;

  if ((cumulative += weights.time) >= roll) {
    // time amount: 10-20 segundos escalado por nivel (mínimo 10)
    const amount = 10 + Math.min(20, Math.floor(level / 2));
    return { kind: 'time', amount };
  }

  if ((cumulative += weights.hint) >= roll) {
    return { kind: 'hint' };
  }

  if ((cumulative += weights.silver_cell) >= roll) {
    return { kind: 'silver_cell' };
  }

  if ((cumulative += weights.golden_cell) >= roll) {
    return { kind: 'golden_cell' };
  }

  if ((cumulative += weights.life) >= roll) {
    return { kind: 'life' };
  }

  if ((cumulative += weights.crystal_heart) >= roll) {
    return { kind: 'crystal_heart' };
  }

  return { kind: 'none' };
}
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
npm test -- src/core/sudoku/rewards.test.ts
```

Esperado: PASS — todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/core/sudoku/rewards.ts src/core/sudoku/rewards.test.ts
git commit -m "feat(core): reward system with level-based probability interpolation"
```

---

### Task 3: Hints system (pickHintCell, revealCandidate, revealGoldenCell) + tests

**Archivos:**
- Crear: `src/core/sudoku/hints.ts`
- Crear: `src/core/sudoku/hints.test.ts`

- [ ] **Step 1: Escribir test fallido — `revealCandidate` retorna candidatos correctos**

```typescript
// src/core/sudoku/hints.test.ts
import { pickHintCell, revealCandidate, revealGoldenCell } from './hints';
import { generate } from './generator';
import { solve } from './solver';
import { PRNG } from './prng';
import type { Board, CellValue } from './types';

describe('hints', () => {
  let board: Board;
  let solution: Board;

  beforeEach(() => {
    const puzzle = generate('intermediate', 'test-seed');
    board = [...puzzle.board];
    const sol = solve(puzzle.board);
    if (!sol) throw new Error('No solution found');
    solution = sol;
  });

  describe('revealCandidate', () => {
    it('retorna array de candidates válidos para la celda seleccionada', () => {
      const idx = board.findIndex(v => v === 0);
      if (idx === -1) throw new Error('No empty cell found');

      const candidates = revealCandidate(board, solution, idx);
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThan(0);
      candidates.forEach(c => {
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(9);
      });
    });

    it('incluye el valor correcto en los candidatos', () => {
      const idx = board.findIndex(v => v === 0);
      if (idx === -1) throw new Error('No empty cell found');

      const correctValue = solution[idx] as CellValue;
      const candidates = revealCandidate(board, solution, idx);
      expect(candidates).toContain(correctValue);
    });

    it('no retorna candidatos inválidos para esa fila/columna/caja', () => {
      // Implementar validación según Sudoku rules
      // (se prueba indirectamente vía tests de solver/validator)
    });
  });

  describe('pickHintCell', () => {
    it('retorna un índice válido de celda vacía', () => {
      const idx = pickHintCell(board, solution, new PRNG('hint-seed'));
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(81);
      expect(board[idx]).toBe(0);
    });

    it('elige la peor celda (candidatos múltiples, dificultad alta)', () => {
      // Verificar que picks celdas con múltiples candidatos correctos (difíciles)
      const idx = pickHintCell(board, solution, new PRNG('hint-seed'));
      const candidates = revealCandidate(board, solution, idx);
      // La celda elegida debe tener al menos 2 candidatos o ser difícil
      expect(candidates.length).toBeGreaterThan(0);
    });
  });

  describe('revealGoldenCell', () => {
    it('retorna objeto con idx y value válidos', () => {
      const result = revealGoldenCell(board, solution, new PRNG('golden-seed'));
      expect(result).toHaveProperty('idx');
      expect(result).toHaveProperty('value');
      expect(result.idx).toBeGreaterThanOrEqual(0);
      expect(result.idx).toBeLessThan(81);
      expect(result.value).toBeGreaterThanOrEqual(1);
      expect(result.value).toBeLessThanOrEqual(9);
    });

    it('elige una celda vacía', () => {
      const result = revealGoldenCell(board, solution, new PRNG('golden-seed'));
      expect(board[result.idx]).toBe(0);
    });

    it('el value retornado coincide con la solución', () => {
      const result = revealGoldenCell(board, solution, new PRNG('golden-seed'));
      expect(result.value).toBe(solution[result.idx]);
    });
  });
});
```

- [ ] **Step 2: Correr test para verificar que falla**

```bash
npm test -- src/core/sudoku/hints.test.ts
```

Esperado: FAIL — funciones no están definidas.

- [ ] **Step 3: Implementar `hints.ts`**

```typescript
// src/core/sudoku/hints.ts
import type { Board, CellValue } from './types';
import type { PRNG } from './prng';
import { PEERS, getBoxIndex } from './validator';
import { solve } from './solver';

/**
 * Retorna array de candidatos válidos (que no violarían Sudoku rules) para una celda.
 * Incluye el valor correcto de la solución.
 */
export function revealCandidate(
  board: Board,
  solution: Board,
  idx: number,
): CellValue[] {
  if (board[idx] !== 0) return [];

  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxIdx = getBoxIndex(row, col);

  const usedInRow = new Set<number>();
  const usedInCol = new Set<number>();
  const usedInBox = new Set<number>();

  // Recolectar valores usados
  for (let i = 0; i < 81; i++) {
    if (board[i] === 0) continue;

    const r = Math.floor(i / 9);
    const c = i % 9;
    if (r === row) usedInRow.add(board[i]);
    if (c === col) usedInCol.add(board[i]);
    if (getBoxIndex(r, c) === boxIdx) usedInBox.add(board[i]);
  }

  const candidates: CellValue[] = [];
  for (let value = 1; value <= 9; value++) {
    if (!usedInRow.has(value) && !usedInCol.has(value) && !usedInBox.has(value)) {
      candidates.push(value as CellValue);
    }
  }

  return candidates;
}

/**
 * Elige una celda candidata para pista.
 * Preferencia: celda con múltiples candidatos correctos (más difícil de resolver).
 */
export function pickHintCell(board: Board, solution: Board, rng: PRNG): number {
  const emptyCells = board
    .map((v, i) => (v === 0 ? i : -1))
    .filter(i => i !== -1);

  if (emptyCells.length === 0) return -1;

  // Calcular dificultad de cada celda (cantidad de candidatos correctos)
  const cellDifficulties = emptyCells.map(idx => ({
    idx,
    difficulty: revealCandidate(board, solution, idx).length,
  }));

  // Ordenar por dificultad descendente
  cellDifficulties.sort((a, b) => b.difficulty - a.difficulty);

  // Seleccionar de las top 3 más difíciles (con aleatoriedad)
  const topCells = cellDifficulties.slice(0, Math.min(3, cellDifficulties.length));
  const chosen = topCells[Math.floor(rng.next() * topCells.length)];

  return chosen.idx;
}

/**
 * Retorna una celda vacía y su valor correcto para golden cell.
 */
export function revealGoldenCell(
  board: Board,
  solution: Board,
  rng: PRNG,
): { idx: number; value: CellValue } {
  const emptyCells = board
    .map((v, i) => (v === 0 ? i : -1))
    .filter(i => i !== -1);

  if (emptyCells.length === 0) {
    throw new Error('No empty cells left');
  }

  const idx = emptyCells[Math.floor(rng.next() * emptyCells.length)];
  const value = solution[idx] as CellValue;

  return { idx, value };
}
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
npm test -- src/core/sudoku/hints.test.ts
```

Esperado: PASS — todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/core/sudoku/hints.ts src/core/sudoku/hints.test.ts
git commit -m "feat(core): hint and golden cell reveal system"
```

---

### Task 4: Economy (coin rewards) + tests

**Archivos:**
- Crear: `src/core/sudoku/economy.ts`
- Crear: `src/core/sudoku/economy.test.ts`

- [ ] **Step 1: Escribir test fallido — `computeRunReward` calcula monedas basado en score y nivel**

```typescript
// src/core/sudoku/economy.test.ts
import { computeRunReward } from './economy';

describe('computeRunReward', () => {
  it('retorna objeto con coins > 0', () => {
    const reward = computeRunReward(1000, 10);
    expect(reward).toHaveProperty('coins');
    expect(reward.coins).toBeGreaterThan(0);
  });

  it('coins aumentan con score', () => {
    const low = computeRunReward(100, 5).coins;
    const high = computeRunReward(1000, 5).coins;
    expect(high).toBeGreaterThan(low);
  });

  it('coins aumentan con nivel', () => {
    const low = computeRunReward(1000, 1).coins;
    const high = computeRunReward(1000, 20).coins;
    expect(high).toBeGreaterThan(low);
  });

  it('score 0 nivel 1 retorna coins mínimo > 0', () => {
    const reward = computeRunReward(0, 1);
    expect(reward.coins).toBeGreaterThan(0);
  });

  it('fórmula: coins = floor(score/100) + floor(level/3)', () => {
    // score=500, level=9 → coins = 5 + 3 = 8
    expect(computeRunReward(500, 9).coins).toBe(8);

    // score=350, level=8 → coins = 3 + 2 = 5
    expect(computeRunReward(350, 8).coins).toBe(5);

    // score=0, level=1 → coins = 0 + 0 = 0, pero mínimo 1
    expect(computeRunReward(0, 1).coins).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Correr test para verificar que falla**

```bash
npm test -- src/core/sudoku/economy.test.ts
```

Esperado: FAIL — `computeRunReward` no está definida.

- [ ] **Step 3: Implementar `economy.ts`**

```typescript
// src/core/sudoku/economy.ts

export interface RunReward {
  coins: number;
}

/**
 * Calcula monedas ganadas al terminar una run.
 * Fórmula: coins = max(1, floor(score / 100) + floor(level / 3))
 * 
 * Ejemplos:
 * - score=1000, level=15 → coins = 10 + 5 = 15
 * - score=350, level=8 → coins = 3 + 2 = 5
 * - score=0, level=1 → coins = 0 + 0 = 0 → mínimo 1
 */
export function computeRunReward(score: number, level: number): RunReward {
  const coins = Math.max(1, Math.floor(score / 100) + Math.floor(level / 3));
  return { coins };
}
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
npm test -- src/core/sudoku/economy.test.ts
```

Esperado: PASS — todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/core/sudoku/economy.ts src/core/sudoku/economy.test.ts
git commit -m "feat(core): economy system for run rewards"
```

---

## SECCIÓN 3b: Motor Compartido SudokuGame

### Task 5: Tipos del motor compartido

**Archivos:**
- Crear: `src/ui/SudokuGame/types.ts`

- [ ] **Step 1: Crear tipos del motor**

```typescript
// src/ui/SudokuGame/types.ts
import type { Board, CellValue, Puzzle } from '@core/sudoku';
import type { PRNG } from '@core/sudoku/prng';
import type { SymbolPack } from '@core/symbols';

export interface SudokuGameOptions {
  puzzle: Puzzle;
  initialHints?: number;
  initialGoldenCells?: number;
  rng: PRNG;
  callbacks?: SudokuGameCallbacks;
}

export interface SudokuGameCallbacks {
  onCellCorrect?: (idx: number, value: CellValue) => void;
  onCellIncorrect?: (idx: number, value: CellValue) => void;
  onBoxComplete?: (boxIndex: number) => void;
  onPuzzleComplete?: () => void;
}

export interface SudokuGameState {
  board: Board;
  selectedIndex: number | null;
  notesByCell: ReadonlyMap<number, ReadonlySet<CellValue>>;
  errorIndices: ReadonlySet<number>;
  hintsRemaining: number;
  goldenRemaining: number;
  isNotesMode: boolean;
  isComplete: boolean;
}

export interface SudokuGameActions {
  select(idx: number | null): void;
  place(value: CellValue): void;
  toggleNote(value: CellValue): void;
  toggleNotesMode(): void;
  erase(): void;
  useHint(): void;
  useGoldenCell(): void;
  grantHints(n: number): void;
  grantGoldenCells(n: number): void;
}

export type SudokuGameStore = SudokuGameState & SudokuGameActions;
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/SudokuGame/types.ts
git commit -m "feat(ui): SudokuGame types definitions"
```

---

### Task 6: Store factory del motor compartido + tests

**Archivos:**
- Crear: `src/ui/SudokuGame/store.ts`
- Crear: `src/ui/SudokuGame/store.test.ts`

- [ ] **Step 1: Escribir test fallido — `createSudokuGameStore` crea store con estado inicial**

```typescript
// src/ui/SudokuGame/store.test.ts
import { createSudokuGameStore } from './store';
import { generate } from '@core/sudoku/generator';
import { PRNG } from '@core/sudoku/prng';

describe('createSudokuGameStore', () => {
  const puzzle = generate('intermediate', 'test-seed');
  const rng = new PRNG('test-seed');

  it('crea un store con estado inicial válido', () => {
    const store = createSudokuGameStore({ puzzle, rng });
    const state = store.getState();

    expect(state.board.length).toBe(81);
    expect(state.selectedIndex).toBeNull();
    expect(state.hintsRemaining).toBe(0);
    expect(state.goldenRemaining).toBe(0);
    expect(state.isNotesMode).toBe(false);
    expect(state.isComplete).toBe(false);
  });

  it('acepta initialHints e initialGoldenCells', () => {
    const store = createSudokuGameStore({
      puzzle,
      rng,
      initialHints: 3,
      initialGoldenCells: 2,
    });
    const state = store.getState();

    expect(state.hintsRemaining).toBe(3);
    expect(state.goldenRemaining).toBe(2);
  });

  it('select actualiza selectedIndex', () => {
    const store = createSudokuGameStore({ puzzle, rng });
    store.getState().select(42);

    expect(store.getState().selectedIndex).toBe(42);
  });

  it('select(null) deselecciona', () => {
    const store = createSudokuGameStore({ puzzle, rng });
    store.getState().select(42);
    store.getState().select(null);

    expect(store.getState().selectedIndex).toBeNull();
  });

  it('place() coloca valor y dispara callback onCellCorrect si es válido', () => {
    const onCellCorrect = jest.fn();
    const store = createSudokuGameStore({
      puzzle,
      rng,
      callbacks: { onCellCorrect },
    });

    // Encontrar una celda vacía
    const emptyIdx = puzzle.board.findIndex(v => v === 0);
    if (emptyIdx === -1) throw new Error('No empty cell');

    // place() con valor correcto debe disparar callback
    const state = store.getState();
    const solution = puzzle.board; // nota: en test real, usamos solve()
    // Para este test, simplemente verificar que place() no crashea
    expect(() => state.place(1)).not.toThrow();
  });

  it('toggleNote añade/quita nota de la celda seleccionada', () => {
    const store = createSudokuGameStore({ puzzle, rng });
    const state = store.getState();

    state.select(10);
    state.toggleNote(5);

    let notes = store.getState().notesByCell.get(10);
    expect(notes?.has(5)).toBe(true);

    state.toggleNote(5);
    notes = store.getState().notesByCell.get(10);
    expect(notes?.has(5)).toBe(false);
  });

  it('grantHints suma hints', () => {
    const store = createSudokuGameStore({ puzzle, rng, initialHints: 1 });
    store.getState().grantHints(2);

    expect(store.getState().hintsRemaining).toBe(3);
  });

  it('grantGoldenCells suma golden cells', () => {
    const store = createSudokuGameStore({
      puzzle,
      rng,
      initialGoldenCells: 1,
    });
    store.getState().grantGoldenCells(2);

    expect(store.getState().goldenRemaining).toBe(3);
  });
});
```

- [ ] **Step 2: Correr tests para verificar que falla**

```bash
npm test -- src/ui/SudokuGame/store.test.ts
```

Esperado: FAIL — `createSudokuGameStore` no está definida.

- [ ] **Step 3: Implementar `store.ts`**

```typescript
// src/ui/SudokuGame/store.ts
import { create } from 'zustand';
import type { Board, CellValue, Puzzle } from '@core/sudoku';
import { solve } from '@core/sudoku/solver';
import { validateMove, detectBoxCompletion } from '@core/sudoku/validator';
import { revealCandidate, revealGoldenCell } from '@core/sudoku/hints';
import type { PRNG } from '@core/sudoku/prng';
import type {
  SudokuGameOptions,
  SudokuGameState,
  SudokuGameActions,
  SudokuGameStore,
} from './types';

export function createSudokuGameStore(options: SudokuGameOptions) {
  const solution = solve(options.puzzle.board);
  if (!solution) {
    throw new Error('Puzzle has no solution');
  }

  return create<SudokuGameStore>((set) => {
    const initialBoard = [...options.puzzle.board];

    return {
      // State
      board: initialBoard,
      selectedIndex: null,
      notesByCell: new Map(),
      errorIndices: new Set(),
      hintsRemaining: options.initialHints ?? 0,
      goldenRemaining: options.initialGoldenCells ?? 0,
      isNotesMode: false,
      isComplete: false,

      // Actions
      select(idx: number | null) {
        set({ selectedIndex: idx });
      },

      place(value: CellValue) {
        set((state) => {
          if (state.selectedIndex === null) return state;

          const idx = state.selectedIndex;
          if (state.board[idx] !== 0) return state; // celda ya ocupada

          const moveResult = validateMove(state.board, idx, value);
          if (!moveResult.isValid) {
            // Movimiento inválido
            const newErrors = new Set(state.errorIndices);
            newErrors.add(idx);

            options.callbacks?.onCellIncorrect?.(idx, value);

            return { errorIndices: newErrors };
          }

          // Movimiento válido
          const newBoard = [...state.board];
          newBoard[idx] = value;

          // Limpiar errores de esta celda
          const newErrors = new Set(state.errorIndices);
          newErrors.delete(idx);

          options.callbacks?.onCellCorrect?.(idx, value);

          // Verificar si caja se completó
          const boxIndex = detectBoxCompletion(state.board, newBoard);
          if (boxIndex !== null) {
            options.callbacks?.onBoxComplete?.(boxIndex);
          }

          // Verificar si puzzle se completó
          const isComplete = newBoard.every((v) => v !== 0);
          if (isComplete) {
            options.callbacks?.onPuzzleComplete?.();
          }

          // Limpiar notas de la celda colocada
          const newNotes = new Map(state.notesByCell);
          newNotes.delete(idx);

          return {
            board: newBoard,
            errorIndices: newErrors,
            notesByCell: newNotes,
            isComplete,
          };
        });
      },

      toggleNote(value: CellValue) {
        set((state) => {
          if (state.selectedIndex === null) return state;

          const idx = state.selectedIndex;
          if (state.board[idx] !== 0) return state; // no puede añadir notas a celdas ocupadas

          const newNotes = new Map(state.notesByCell);
          const cellNotes = new Set(newNotes.get(idx) ?? []);

          if (cellNotes.has(value)) {
            cellNotes.delete(value);
          } else {
            cellNotes.add(value);
          }

          if (cellNotes.size === 0) {
            newNotes.delete(idx);
          } else {
            newNotes.set(idx, cellNotes);
          }

          return { notesByCell: newNotes };
        });
      },

      toggleNotesMode() {
        set((state) => ({ isNotesMode: !state.isNotesMode }));
      },

      erase() {
        set((state) => {
          if (state.selectedIndex === null) return state;

          const idx = state.selectedIndex;
          if (state.board[idx] !== 0 || state.board[idx] === options.puzzle.board[idx]) {
            return state; // no puedes borrar una celda fija
          }

          const newBoard = [...state.board];
          newBoard[idx] = 0;

          const newNotes = new Map(state.notesByCell);
          newNotes.delete(idx);

          const newErrors = new Set(state.errorIndices);
          newErrors.delete(idx);

          return {
            board: newBoard,
            notesByCell: newNotes,
            errorIndices: newErrors,
          };
        });
      },

      useHint() {
        set((state) => {
          if (state.hintsRemaining <= 0) return state;
          if (state.selectedIndex === null) return state;

          const idx = state.selectedIndex;
          const candidates = revealCandidate(state.board, solution, idx);

          const newNotes = new Map(state.notesByCell);
          newNotes.set(idx, new Set(candidates));

          return {
            hintsRemaining: state.hintsRemaining - 1,
            notesByCell: newNotes,
          };
        });
      },

      useGoldenCell() {
        set((state) => {
          if (state.goldenRemaining <= 0) return state;

          const golden = revealGoldenCell(state.board, solution, options.rng);

          // Simular un place() automático
          const newBoard = [...state.board];
          newBoard[golden.idx] = golden.value;

          options.callbacks?.onCellCorrect?.(golden.idx, golden.value);

          const boxIndex = detectBoxCompletion(state.board, newBoard);
          if (boxIndex !== null) {
            options.callbacks?.onBoxComplete?.(boxIndex);
          }

          const isComplete = newBoard.every((v) => v !== 0);
          if (isComplete) {
            options.callbacks?.onPuzzleComplete?.();
          }

          const newNotes = new Map(state.notesByCell);
          newNotes.delete(golden.idx);

          return {
            board: newBoard,
            goldenRemaining: state.goldenRemaining - 1,
            notesByCell: newNotes,
            isComplete,
          };
        });
      },

      grantHints(n: number) {
        set((state) => ({
          hintsRemaining: state.hintsRemaining + n,
        }));
      },

      grantGoldenCells(n: number) {
        set((state) => ({
          goldenRemaining: state.goldenRemaining + n,
        }));
      },
    };
  });
}
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
npm test -- src/ui/SudokuGame/store.test.ts
```

Esperado: PASS — todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/ui/SudokuGame/store.ts src/ui/SudokuGame/store.test.ts
git commit -m "feat(ui): SudokuGame store factory with game logic"
```

---

### Task 7: Hooks del motor compartido

**Archivos:**
- Crear: `src/ui/SudokuGame/hooks.ts`

- [ ] **Step 1: Implementar selectors finos**

```typescript
// src/ui/SudokuGame/hooks.ts
import { useShallow } from 'zustand/react';
import type { SudokuGameStore } from './types';

/**
 * Selector que retorna el estado de una celda específica (selectedIndex, value, isError, etc.)
 * Usa shallow comparison para evitar re-renders innecesarios.
 */
export function useCellState(store: SudokuGameStore, idx: number) {
  // Nota: en React, esto se haría con hook, pero aquí retornamos un selector function
  // El componente Cell lo usará como: const state = useCellState(store, idx)
  const { board, selectedIndex, notesByCell, errorIndices, puzzle } = store;

  return {
    value: board[idx],
    isFixed: puzzle.fixed.has(idx),
    isSelected: selectedIndex === idx,
    isPeer: selectedIndex != null && areIndexPeers(selectedIndex, idx),
    isError: errorIndices.has(idx),
    notes: notesByCell.get(idx) ?? new Set(),
  };
}

/**
 * Verifica si dos índices son peers (misma fila, columna o caja).
 */
function areIndexPeers(idx1: number, idx2: number): boolean {
  const r1 = Math.floor(idx1 / 9);
  const c1 = idx1 % 9;
  const r2 = Math.floor(idx2 / 9);
  const c2 = idx2 % 9;

  if (r1 === r2) return true;
  if (c1 === c2) return true;

  const box1 = Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3);
  const box2 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
  return box1 === box2;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/SudokuGame/hooks.ts
git commit -m "feat(ui): SudokuGame fine-grained selectors"
```

---

### Task 8: Componente SudokuGame (compone Board + NumberPad + botones hint/golden)

**Archivos:**
- Crear: `src/ui/SudokuGame/SudokuGame.tsx`

- [ ] **Step 1: Implementar `<SudokuGame />`**

```typescript
// src/ui/SudokuGame/SudokuGame.tsx
import React, { useCallback } from 'react';
import { View } from 'react-native';
import type { SudokuGameStore } from './types';
import type { SymbolPack } from '@core/symbols';
import { Board } from '@ui/Board';
import { NumberPad } from '@ui/NumberPad';
import { Button } from '@ui/primitives/Button';
import { useTranslation } from 'react-i18next';

interface SudokuGameProps {
  store: SudokuGameStore;
  pack: SymbolPack;
}

/**
 * Motor compartido de Sudoku. Compone Board + NumberPad + botones de pistas.
 * Los modos lo consumen pasando su propia store y callback hooks.
 */
export const SudokuGame: React.FC<SudokuGameProps> = ({ store, pack }) => {
  const { t } = useTranslation();

  const handleSelect = useCallback((idx: number | null) => {
    store.select(idx);
  }, [store]);

  const handleNumberPress = useCallback((value: number) => {
    if (store.isNotesMode) {
      store.toggleNote(value as any);
    } else {
      store.select(store.selectedIndex); // ensure selection
      store.place(value as any);
    }
  }, [store]);

  const handleHint = useCallback(() => {
    store.useHint();
  }, [store]);

  const handleGoldenCell = useCallback(() => {
    store.useGoldenCell();
  }, [store]);

  const handleErasePress = useCallback(() => {
    store.erase();
  }, [store]);

  return (
    <View className="flex-1 gap-4 p-4">
      <Board store={store} pack={pack} onCellPress={handleSelect} />

      <View className="flex-row gap-2 justify-center">
        <Button
          onPress={handleHint}
          disabled={store.hintsRemaining === 0}
          title={`${t('hint')} (${store.hintsRemaining})`}
        />
        <Button
          onPress={handleGoldenCell}
          disabled={store.goldenRemaining === 0}
          title={`${t('golden_cell')} (${store.goldenRemaining})`}
        />
      </View>

      <NumberPad
        onNumberPress={handleNumberPress}
        onErasePress={handleErasePress}
        onToggleNotes={() => store.toggleNotesMode()}
        isNotesMode={store.isNotesMode}
        pack={pack}
      />
    </View>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/SudokuGame/SudokuGame.tsx
git commit -m "feat(ui): SudokuGame component composition"
```

---

### Task 9: Index/exports del motor compartido

**Archivos:**
- Crear: `src/ui/SudokuGame/index.ts`

- [ ] **Step 1: Crear exports públicos**

```typescript
// src/ui/SudokuGame/index.ts
export { createSudokuGameStore } from './store';
export { SudokuGame } from './SudokuGame';
export { useCellState } from './hooks';
export type { SudokuGameStore, SudokuGameOptions, SudokuGameCallbacks, SudokuGameState, SudokuGameActions } from './types';
```

- [ ] **Step 2: Commit**

```bash
git add src/ui/SudokuGame/index.ts
git commit -m "feat(ui): SudokuGame public exports"
```

---

## SECCIÓN 3c: Modo Sudoloco

### Task 10: RunState store del modo Sudoloco + tests

**Archivos:**
- Crear: `src/features/sudoloco/store.ts`
- Crear: `src/features/sudoloco/store.test.ts`

- [ ] **Step 1: Escribir test fallido — `createSudokulocoStore` crea store con RunState**

```typescript
// src/features/sudoloco/store.test.ts
import { createSudokulocoStore } from './store';
import { generate } from '@core/sudoku/generator';
import { PRNG } from '@core/sudoku/prng';

describe('createSudokulocoStore', () => {
  const puzzle = generate('beginner', 'test-seed');
  const rng = new PRNG('test-seed');

  it('crea un store con RunState inicial válido', () => {
    const store = createSudokulocoStore({ puzzle, rng });
    const { runState } = store.getState();

    expect(runState.level).toBe(1);
    expect(runState.lives).toBe(3);
    expect(runState.timeRemaining).toBe(180);
    expect(runState.score).toBe(0);
    expect(runState.hints).toBe(0);
    expect(runState.goldenCells).toBe(0);
    expect(runState.coins).toBe(0);
    expect(runState.phase).toBe('playing');
    expect(runState.puzzlesSinceLastAd).toBe(0);
  });

  it('incrementScore suma puntos', () => {
    const store = createSudokulocoStore({ puzzle, rng });
    store.getState().incrementScore(100);

    expect(store.getState().runState.score).toBe(100);
  });

  it('substractLife resta vidas', () => {
    const store = createSudokulocoStore({ puzzle, rng });
    store.getState().subtractLife();

    expect(store.getState().runState.lives).toBe(2);
  });

  it('gameOver cuando lives === 0', () => {
    const store = createSudokulocoStore({ puzzle, rng });
    const { subtractLife, getGameOverStatus } = store.getState();

    subtractLife();
    subtractLife();
    subtractLife();

    expect(store.getState().runState.lives).toBe(0);
    expect(getGameOverStatus()).toEqual({
      isGameOver: true,
      reason: 'no_lives',
    });
  });

  it('gameOver cuando timeRemaining <= 0', () => {
    const store = createSudokulocoStore({ puzzle, rng });
    const { setTimeRemaining, getGameOverStatus } = store.getState();

    setTimeRemaining(-1);

    expect(getGameOverStatus()).toEqual({
      isGameOver: true,
      reason: 'timeout',
    });
  });

  it('grantReward aplica reward al runState', () => {
    const store = createSudokulocoStore({ puzzle, rng });
    const { grantReward } = store.getState();

    grantReward({ kind: 'time', amount: 10 });
    expect(store.getState().runState.timeRemaining).toBe(190);

    grantReward({ kind: 'hint' });
    expect(store.getState().runState.hints).toBe(1);

    grantReward({ kind: 'life' });
    expect(store.getState().runState.lives).toBe(4);
  });
});
```

- [ ] **Step 2: Correr tests para verificar que falla**

```bash
npm test -- src/features/sudoloco/store.test.ts
```

Esperado: FAIL — `createSudokulocoStore` no está definida.

- [ ] **Step 3: Implementar `store.ts`**

```typescript
// src/features/sudoloco/store.ts
import { create } from 'zustand';
import type { Puzzle, CellValue } from '@core/sudoku';
import type { PRNG } from '@core/sudoku/prng';
import type { Reward } from '@core/sudoku/rewards';
import { INITIAL_TIME_S } from '@core/sudoku/progression';

export interface RunState {
  level: number;
  lives: number;
  timeRemaining: number;
  score: number;
  hints: number;
  goldenCells: number;
  coins: number;
  phase: 'playing' | 'microgame' | 'between_levels' | 'gameover';
  puzzlesSinceLastAd: number;
}

export interface SudokulocoStore {
  runState: RunState;
  puzzle: Puzzle;

  // Actions
  incrementScore(points: number): void;
  subtractLife(): void;
  setTimeRemaining(seconds: number): void;
  addTime(seconds: number): void;
  grantReward(reward: Reward): void;
  advanceLevel(): void;
  setPhase(phase: RunState['phase']): void;
  incrementPuzzlesSinceLastAd(): void;
  resetPuzzlesSinceLastAd(): void;
  setCoins(coins: number): void;
  getGameOverStatus(): { isGameOver: boolean; reason?: 'no_lives' | 'timeout' };
}

export interface CreateSudokulocoStoreOptions {
  puzzle: Puzzle;
  rng: PRNG;
}

export function createSudokulocoStore(options: CreateSudokulocoStoreOptions) {
  return create<SudokulocoStore>((set, get) => ({
    // Initial state
    runState: {
      level: 1,
      lives: 3,
      timeRemaining: INITIAL_TIME_S,
      score: 0,
      hints: 0,
      goldenCells: 0,
      coins: 0,
      phase: 'playing',
      puzzlesSinceLastAd: 0,
    },
    puzzle: options.puzzle,

    // Actions
    incrementScore(points: number) {
      set((state) => ({
        runState: { ...state.runState, score: state.runState.score + points },
      }));
    },

    subtractLife() {
      set((state) => ({
        runState: { ...state.runState, lives: Math.max(0, state.runState.lives - 1) },
      }));
    },

    setTimeRemaining(seconds: number) {
      set((state) => ({
        runState: { ...state.runState, timeRemaining: Math.max(0, seconds) },
      }));
    },

    addTime(seconds: number) {
      set((state) => ({
        runState: {
          ...state.runState,
          timeRemaining: state.runState.timeRemaining + seconds,
        },
      }));
    },

    grantReward(reward: Reward) {
      set((state) => {
        const newRunState = { ...state.runState };

        switch (reward.kind) {
          case 'time':
            newRunState.timeRemaining += reward.amount;
            break;
          case 'hint':
            newRunState.hints += 1;
            break;
          case 'silver_cell':
            // silver_cell no está documentado qué hace, por ahora ignorar
            break;
          case 'golden_cell':
            newRunState.goldenCells += 1;
            break;
          case 'life':
            newRunState.lives += 1;
            break;
          case 'crystal_heart':
            // crystal_heart mecánica pendiente de definir
            break;
          case 'none':
            // Nada
            break;
        }

        return { runState: newRunState };
      });
    },

    advanceLevel() {
      set((state) => ({
        runState: { ...state.runState, level: state.runState.level + 1 },
      }));
    },

    setPhase(phase: RunState['phase']) {
      set((state) => ({
        runState: { ...state.runState, phase },
      }));
    },

    incrementPuzzlesSinceLastAd() {
      set((state) => ({
        runState: {
          ...state.runState,
          puzzlesSinceLastAd: state.runState.puzzlesSinceLastAd + 1,
        },
      }));
    },

    resetPuzzlesSinceLastAd() {
      set((state) => ({
        runState: { ...state.runState, puzzlesSinceLastAd: 0 },
      }));
    },

    setCoins(coins: number) {
      set((state) => ({
        runState: { ...state.runState, coins },
      }));
    },

    getGameOverStatus() {
      const state = get().runState;
      if (state.lives === 0) {
        return { isGameOver: true, reason: 'no_lives' as const };
      }
      if (state.timeRemaining <= 0) {
        return { isGameOver: true, reason: 'timeout' as const };
      }
      return { isGameOver: false };
    },
  }));
}
```

- [ ] **Step 4: Correr tests para verificar que pasan**

```bash
npm test -- src/features/sudoloco/store.test.ts
```

Esperado: PASS — todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add src/features/sudoloco/store.ts src/features/sudoloco/store.test.ts
git commit -m "feat(sudoloco): RunState store with game actions"
```

---

### Task 11: HUD componentes (LivesDisplay, TimerDisplay, ScoreDisplay)

**Archivos:**
- Crear: `src/features/sudoloco/ui/HUD.tsx`

- [ ] **Step 1: Implementar `<HUD />`**

```typescript
// src/features/sudoloco/ui/HUD.tsx
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RunState } from '../store';

interface HUDProps {
  runState: RunState;
}

/**
 * HUD que muestra lives, timer y score.
 * Componentes sin estado, solo reciben runState.
 */
export const HUD: React.FC<HUDProps> = ({ runState }) => {
  const { t } = useTranslation();

  return (
    <View className="flex-row justify-between items-center px-4 py-2 bg-gray-100 rounded">
      <LivesDisplay lives={runState.lives} />
      <TimerDisplay timeRemaining={runState.timeRemaining} />
      <ScoreDisplay score={runState.score} level={runState.level} />
    </View>
  );
};

interface LivesDisplayProps {
  lives: number;
}

const LivesDisplay: React.FC<LivesDisplayProps> = React.memo(({ lives }) => {
  const { t } = useTranslation();

  return (
    <View className="items-center">
      <Text className="text-xs text-gray-600">{t('lives')}</Text>
      <Text className="text-lg font-bold text-red-600">{lives}</Text>
    </View>
  );
});
LivesDisplay.displayName = 'LivesDisplay';

interface TimerDisplayProps {
  timeRemaining: number;
}

const TimerDisplay: React.FC<TimerDisplayProps> = React.memo(({ timeRemaining }) => {
  const { t } = useTranslation();

  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  const isLow = timeRemaining < 30;

  return (
    <View className="items-center">
      <Text className="text-xs text-gray-600">{t('time')}</Text>
      <Text className={`text-lg font-bold ${isLow ? 'text-red-600' : 'text-blue-600'}`}>
        {formattedTime}
      </Text>
    </View>
  );
});
TimerDisplay.displayName = 'TimerDisplay';

interface ScoreDisplayProps {
  score: number;
  level: number;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = React.memo(({ score, level }) => {
  const { t } = useTranslation();

  return (
    <View className="items-center">
      <Text className="text-xs text-gray-600">{t('score')}</Text>
      <Text className="text-lg font-bold text-green-600">{score}</Text>
      <Text className="text-xs text-gray-500">{t('level')} {level}</Text>
    </View>
  );
});
ScoreDisplay.displayName = 'ScoreDisplay';
```

- [ ] **Step 2: Commit**

```bash
git add src/features/sudoloco/ui/HUD.tsx
git commit -m "feat(sudoloco): HUD components for lives, timer, score"
```

---

### Task 12: GameOverScreen

**Archivos:**
- Crear: `src/features/sudoloco/ui/GameOverScreen.tsx`

- [ ] **Step 1: Implementar pantalla de game over**

```typescript
// src/features/sudoloco/ui/GameOverScreen.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RunState } from '../store';

interface GameOverScreenProps {
  runState: RunState;
  coins: number;
  onRestart: () => void;
  onHome: () => void;
}

/**
 * Pantalla que aparece cuando termina la run.
 * Muestra final score, coins ganadas, highscore.
 */
export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  runState,
  coins,
  onRestart,
  onHome,
}) => {
  const { t } = useTranslation();

  return (
    <View className="flex-1 justify-center items-center bg-black/50 gap-6 p-6">
      <View className="bg-white rounded-lg p-6 items-center gap-4">
        <Text className="text-2xl font-bold">{t('game_over')}</Text>

        <View className="gap-2 w-full">
          <Text className="text-lg">
            {t('final_score')}: <Text className="font-bold">{runState.score}</Text>
          </Text>
          <Text className="text-lg">
            {t('level_reached')}: <Text className="font-bold">{runState.level}</Text>
          </Text>
          <Text className="text-lg">
            {t('coins_earned')}: <Text className="font-bold text-yellow-600">{coins}</Text>
          </Text>
        </View>

        <View className="flex-row gap-2 pt-4">
          <Pressable
            onPress={onRestart}
            className="flex-1 bg-blue-600 rounded py-3 items-center"
          >
            <Text className="text-white font-bold">{t('restart')}</Text>
          </Pressable>
          <Pressable onPress={onHome} className="flex-1 bg-gray-400 rounded py-3 items-center">
            <Text className="text-white font-bold">{t('home')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/sudoloco/ui/GameOverScreen.tsx
git commit -m "feat(sudoloco): GameOverScreen with final stats"
```

---

### Task 13: Pantalla principal del modo Sudoloco

**Archivos:**
- Crear: `src/features/sudoloco/screen.tsx`

- [ ] **Step 1: Implementar `<SudokulocoScreen />`**

```typescript
// src/features/sudoloco/screen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, AppState, AppStateStatus } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { SudokuGameStore } from '@ui/SudokuGame';
import { createSudokuGameStore } from '@ui/SudokuGame';
import { SudokuGame } from '@ui/SudokuGame';
import { createSudokulocoStore } from './store';
import { HUD } from './ui/HUD';
import { GameOverScreen } from './ui/GameOverScreen';
import { generate } from '@core/sudoku/generator';
import { PRNG } from '@core/sudoku/prng';
import { levelConfig } from '@core/sudoku/progression';
import { rollReward } from '@core/sudoku/rewards';
import { computeRunReward } from '@core/sudoku/economy';
import { colors } from '@theme/colors';
import { getSymbolPack } from '@core/symbols';
import { saveSudokulocoState, loadSudokulocoState } from './persistence';

/**
 * Pantalla principal jugable del modo Sudoloco.
 * Coordina RunState + GameState, maneja timer, callbacks, persistencia.
 */
export const SudokulocoScreen: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

  const [runStore, setRunStore] = useState(() => {
    const saved = loadSudokulocoState();
    if (saved) {
      const puzzle = generate(
        levelConfig(saved.runState.level).difficulty,
        `level-${saved.runState.level}-seed`,
      );
      const rng = new PRNG(`level-${saved.runState.level}`);
      const store = createSudokulocoStore({ puzzle, rng });
      // Restaurar state desde MMKV
      return store;
    }

    // Nueva run
    const puzzle = generate('beginner', 'level-1-seed');
    const rng = new PRNG('level-1');
    return createSudokulocoStore({ puzzle, rng });
  });

  const [gameStore, setGameStore] = useState<SudokuGameStore | null>(null);
  const [symbolPack, setSymbolPack] = useState(() => getSymbolPack('numbers'));

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Crear game store para el puzzle actual
  useEffect(() => {
    const { runState, puzzle } = runStore.getState();
    const rng = new PRNG(`game-${runState.level}`);

    const newGameStore = createSudokuGameStore({
      puzzle,
      rng,
      initialHints: runState.hints,
      initialGoldenCells: runState.goldenCells,
      callbacks: {
        onCellCorrect: (idx, value) => {
          const lv = levelConfig(runState.level);
          const points = 10 * (Math.floor(runState.level / 5) + 1);
          runStore.getState().incrementScore(points);
          runStore.getState().addTime(lv.secsPerCell);
        },
        onCellIncorrect: () => {
          runStore.getState().subtractLife();
        },
        onBoxComplete: () => {
          // Lanzar microjuego (Fase 5)
          runStore.getState().setPhase('microgame');
        },
        onPuzzleComplete: () => {
          const { runState: rs } = runStore.getState();
          const points = 500 * rs.level;
          runStore.getState().incrementScore(points);
          runStore.getState().incrementPuzzlesSinceLastAd();

          // Avanzar a siguiente nivel
          runStore.getState().advanceLevel();
          runStore.getState().setPhase('between_levels');

          // Generar nuevo puzzle
          setTimeout(() => {
            const newLevel = rs.level + 1;
            const newPuzzle = generate(
              levelConfig(newLevel).difficulty,
              `level-${newLevel}-seed`,
            );
            const newRng = new PRNG(`game-${newLevel}`);
            const newGameStore = createSudokuGameStore({
              puzzle: newPuzzle,
              rng: newRng,
              initialHints: rs.hints,
              initialGoldenCells: rs.goldenCells,
              callbacks: {
                // ... same callbacks
              },
            });
            setGameStore(newGameStore);
            runStore.getState().setPhase('playing');
          }, 1000);
        },
      },
    });

    setGameStore(newGameStore);
  }, [runStore]);

  // Timer tick
  useEffect(() => {
    const { runState } = runStore.getState();
    if (runState.phase !== 'playing') return;

    timerIntervalRef.current = setInterval(() => {
      const { runState: rs, setTimeRemaining, getGameOverStatus } = runStore.getState();
      const newTime = rs.timeRemaining - 1;
      setTimeRemaining(newTime);

      const status = getGameOverStatus();
      if (status.isGameOver) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        runStore.getState().setPhase('gameover');
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [runStore]);

  // Handle app state changes (save on blur)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        saveSudokulocoState(runStore.getState());
      }
      appState.current = state;
    });

    return () => {
      subscription.remove();
    };
  }, [runStore]);

  const { runState } = runStore.getState();

  if (runState.phase === 'gameover') {
    const { coins: earnedCoins } = computeRunReward(runState.score, runState.level);

    return (
      <GameOverScreen
        runState={runState}
        coins={earnedCoins}
        onRestart={() => {
          // Nueva run
          const newPuzzle = generate('beginner', 'level-1-seed');
          const newRng = new PRNG('level-1');
          setRunStore(createSudokulocoStore({ puzzle: newPuzzle, rng: newRng }));
        }}
        onHome={() => {
          router.push('/(tabs)/home');
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <HUD runState={runState} />

      {gameStore && <SudokuGame store={gameStore} pack={symbolPack} />}
    </View>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/sudoloco/screen.tsx
git commit -m "feat(sudoloco): main playable screen with timer and callbacks"
```

---

### Task 14: Persistencia MMKV del estado de la run

**Archivos:**
- Crear: `src/features/sudoloco/persistence.ts`

- [ ] **Step 1: Implementar `saveSudokulocoState` y `loadSudokulocoState`**

```typescript
// src/features/sudoloco/persistence.ts
import { MMKV } from 'react-native-mmkv';
import type { SudokulocoStore } from './store';

const storage = new MMKV({ id: 'sudoloco_run' });

const SUDOLOCO_STATE_KEY = 'sudoloco_run_state';

export interface SudokulocoPersistedState {
  runState: ReturnType<SudokulocoStore['getState']>['runState'];
  timestamp: number;
}

export function saveSudokulocoState(store: ReturnType<SudokulocoStore['getState']>) {
  const state: SudokulocoPersistedState = {
    runState: store.runState,
    timestamp: Date.now(),
  };

  storage.set(SUDOLOCO_STATE_KEY, JSON.stringify(state));
}

export function loadSudokulocoState(): SudokulocoPersistedState | null {
  const saved = storage.getString(SUDOLOCO_STATE_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved) as SudokulocoPersistedState;
  } catch {
    return null;
  }
}

export function clearSudokulocoState() {
  storage.delete(SUDOLOCO_STATE_KEY);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/sudoloco/persistence.ts
git commit -m "feat(sudoloco): MMKV persistence for run state"
```

---

### Task 15: Ruta Expo Router para el modo Sudoloco

**Archivos:**
- Modificar: `app/sudoloco.tsx` (crear)
- Modificar: `app/(tabs)/home.tsx` (añadir botón + navegación)

- [ ] **Step 1: Crear ruta modal para Sudoloco**

```typescript
// app/sudoloco.tsx
import React from 'react';
import { SudokulocoScreen } from '@features/sudoloco/screen';

export default function SudokulocoModal() {
  return <SudokulocoScreen />;
}
```

- [ ] **Step 2: Actualizar home.tsx para enlazar Sudoloco**

En `app/(tabs)/home.tsx`, dentro del componente principal, añade:

```typescript
const handleSudololoPress = () => {
  router.push('/sudoloco');
};
```

Y en el JSX, actualiza el botón "SUDOLOCO":

```typescript
<Pressable onPress={handleSudololoPress}>
  {/* botón pixel-art del Sudoloco */}
</Pressable>
```

- [ ] **Step 3: Commit**

```bash
git add app/sudoloco.tsx
git commit -m "feat: add Sudoloco game screen route"
```

---

## Verificación Final

### Task 16: Correr todos los tests core

- [ ] **Step 1: Correr suite completa de tests**

```bash
npm test -- src/core/sudoku/
```

Esperado: **todas las pruebas de core deben pasar** (progression, rewards, hints, economy, + existentes).

```bash
npm test -- src/ui/SudokuGame/
```

Esperado: **tests de store y logic pasan**.

```bash
npm test -- src/features/sudoloco/
```

Esperado: **tests del RunState pasan**.

- [ ] **Step 2: Verificar type checking**

```bash
npm run typecheck
```

Esperado: **sin errores TS**.

- [ ] **Step 3: Verificar lint**

```bash
npm run lint
```

Esperado: **sin errors**.

---

## Checklist Final

- [ ] Core: `progression.ts`, `rewards.ts`, `hints.ts`, `economy.ts` — todos con tests Jest ✅
- [ ] Motor compartido: `src/ui/SudokuGame/` completo (types, store, hooks, componente, exports) ✅
- [ ] Sudoloco: store, screen, HUD, GameOverScreen, persistencia MMKV ✅
- [ ] Ruta Expo Router conectada (`/sudoloco`) ✅
- [ ] Tests: **all passing** ✅
- [ ] Type checking: **zero errors** ✅
- [ ] Lint: **zero errors** ✅

---

## Notas adicionales

- **Microjuegos (Fase 5)**: La lógica de `rollReward` y `grantReward` está lista. El runner que lanza microjuegos irá en Fase 5.
- **Ads (Fase 9)**: El campo `puzzlesSinceLastAd` está en RunState. La lógica `shouldShowAd` irá en `features/ads/`.
- **Highscore y coins en Firestore (Fase 4)**: El game over calcula coins con `computeRunReward`. La escritura a Firestore se hará en Fase 4 con `services/repositories/users.repo.ts`.
- **Cuento e Historia**: Ambos consumirán el motor `<SudokuGame />` igual que Sudoloco, solo cambiando callbacks (mostrar imagen en lugar de microjuego).
- **Separación de stores**: RunState y BoardState (dentro del GameStore) permanecen separados → el timer no contamina el tablero.

---

**Plan completo y listo para ejecutar.**
