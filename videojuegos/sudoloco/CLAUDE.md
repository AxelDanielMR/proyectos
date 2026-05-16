# Sudoloco — guía para Claude

> Lee esto al inicio de cada conversación. Es el resumen operativo. La fuente de verdad detallada es [ARCHITECTURE.md](ARCHITECTURE.md) — consúltala antes de tomar decisiones de diseño.

## Qué es el proyecto

App móvil (Expo + RN) de Sudoku con varios modos:

- **Sudoloco** — modo principal, roguelike. Run infinita: 3 vidas, timer que se acumula entre puzzles, cada celda correcta suma segundos. Game over al perder vidas o timer en 0. El objetivo es batir el propio highscore. **Al terminar la run se canjean monedas** (en función del score) que persisten en el perfil y se gastan en la tienda.
- **Versus Islas** — multijugador asíncrono (mismo seed, cada quien resuelve el suyo, solo se sincroniza % de avance).
- **Versus Mar** — multijugador tiempo real sobre el mismo tablero (RTDB). Puntos por celda correcta colocada primero.
- **Cuento** — un sudoku revela 9 imágenes en orden al completar cada caja.
- **Historia** — cuentos por capítulos (un sudoku = un capítulo).
- **Microjuegos** — al completar una caja sale un microjuego estilo WarioWare. Las recompensas (score, vida, hint, golden cell) se aplican al `RunState` solo en modo Sudoloco. Los microjuegos se desbloquean apareciendo aleatoriamente.
- **Biblioteca** — galería de cuentos completados **y** centro de customización: el usuario selecciona aquí el pack de símbolos activo y (a futuro) el skin del tablero. Es también la entrada a la tienda donde se compran packs/skins con monedas.

## Motor de Sudoku compartido (3 capas — esto es el corazón)

Todos los modos comparten el mismo motor. **Nunca reimplementes lógica de jugar sudoku dentro de un modo** — todo pasa por estas tres capas:

```
┌─ src/features/<modo>/  ──────────────────────────────────────┐
│  Aporta solo: HUD propio, overlays (timer, microjuego,       │
│  imagen de cuento, panel rival), reglas del modo (cuándo     │
│  perder, qué hacer al completar caja).                       │
│  Consume el motor vía store + callbacks.                     │
└──────────────────────────────┬───────────────────────────────┘
                               │ consume
┌─ src/ui/SudokuGame/  (capa compartida — Fase 3) ────────────┐
│  createSudokuGameStore(opts) → Zustand store factory         │
│    state: board, selectedIndex, notes, errorIndices,         │
│           hintsRemaining, goldenRemaining, isComplete        │
│    actions: select, place, toggleNote, useHint,              │
│             useGoldenCell, clear                             │
│    callbacks (los modos los suscriben):                      │
│      onCellCorrect, onCellIncorrect, onBoxComplete,          │
│      onPuzzleComplete                                        │
│  <SudokuGame store pack /> — compone Board + NumberPad +     │
│  botón hint + botón golden cell.                             │
└──────────────────────────────┬───────────────────────────────┘
                               │ usa
┌─ src/core/sudoku/  (puro — Fase 1 ✅, falta hints.ts) ──────┐
│  generator · solver · validator · progress · difficulty      │
│  + hints.ts (pendiente):                                     │
│      revealCandidate(board, sol, idx) → CellValue[]          │
│      pickHintCell(board, sol, rng)    → index                │
│      revealGoldenCell(board, sol, rng) → { idx, value }      │
│  src/core/symbols/  packs (4 en scope: numbers, colors,      │
│                            figures, sprites)                 │
└──────────────────────────────────────────────────────────────┘
```

**Reglas concretas del motor:**

- El store guarda valores `1..9`. El `SymbolPack` es **solo render** — se pasa como prop a `<SudokuGame pack={...} />`. Cambiar pack = cero refactor.
- **Store factory, no singleton.** Cada partida crea su instancia (necesario para Versus Mar con dos tableros simultáneos).
- Los modos **no leen el tablero del store directamente para tomar decisiones de modo** — escuchan callbacks (`onCellCorrect`, `onBoxComplete`, etc.). Esto mantiene el motor agnóstico.
- **Pistas** (`useHint`) = revela los candidatos correctos de una celda elegida automáticamente (peor celda actual o seleccionada). **Casilla dorada** (`useGoldenCell`) = revela el valor exacto de una celda. Lógica en `core/sudoku/hints.ts`, estado del uso en el store.
- **Errores**: el store mantiene un `Set<number>` de índices con error. Lo llena `place()` al detectar movimiento inválido vía `validator.validateMove`. La UI ya pinta `isError`.
- **Determinismo**: el motor recibe el `Puzzle` ya generado por `core/sudoku/generate(difficulty, seed)`. Nunca llama a `Math.random()`.

## Economía y customización

- **Monedas**: persistentes en `/users/{uid}/wallet.coins`. Se ganan **solo al final de una run de Sudoloco** vía fórmula sobre el score final (definir en `core/sudoku/economy.ts` puro y testeable).
- **Tienda** (`features/biblioteca/` o nueva `features/shop/`): cataloga packs y, a futuro, skins. Cada compra registra el `id` en `/users/{uid}/unlocked.symbolPacks[]` (o `boardSkins[]`).
- **Packs de símbolos** (Fase 1 de tienda): `numbers` y `colors` gratis, `figures` y `sprites` (mugiwaras/jojos) desbloqueables. Definidos en `core/symbols/packs.ts`.
- **Skins de tablero** (Fase futura, no ahora): marcos, fondos, esquinas decorativas. Cuando toque, irán en `core/board-skins/` con la misma arquitectura de packs.
- **Selección activa**: el pack y skin activos son del perfil del usuario (`/users/{uid}/active.symbolPackId`), modificables desde Biblioteca.

## Idioma

- **El usuario habla y escribe en español.** Responde en español.
- Strings de UI siempre vía `t('clave')` (i18n con `es`/`en`). Nunca literales en JSX.

## Stack (resumen)

Expo SDK 54 · RN 0.81 · React 19 · TS estricto (`noUncheckedIndexedAccess`) · Expo Router (file-based, `typedRoutes`) · NativeWind 4 · Reanimated 4 · Zustand (una store por feature) · TanStack Query (datos remotos) · Firebase Spark (Auth + Firestore + RTDB + Storage) — **sin Cloud Functions** · Zod (validación runtime) · MMKV + SecureStore · i18next.

## Reglas de oro (no romper)

1. `src/core/` es lógica pura — **no** importa React Native, Expo ni Firebase. Testeable con Jest sin emuladores.
2. **Las features no se importan entre sí.** Si dos features comparten algo, sube a `core/`, `ui/`, `services/` o `lib/`.
3. `services/` es la única vía a Firebase. Las features hablan con repositorios (`users.repo.ts`, `matches.repo.ts`), nunca con `firestore` directo.
4. Una store de Zustand por feature. Sin store global.
5. Estado remoto → React Query. Estado de UI → Zustand. No mezclar.
6. Validar al entrar: datos de Firestore pasan por Zod antes de tipearlos.
7. i18n desde el día 1 — sin strings literales en JSX.
8. Sin comentarios salvo cuando el *por qué* no sea obvio. Nombres descriptivos > comentarios.

## Path aliases

```ts
@core/*      → src/core/*
@features/*  → src/features/*
@ui/*        → src/ui/*
@services/*  → src/services/*
@lib/*       → src/lib/*
@theme/*     → src/theme/*
@i18n/*      → src/i18n/*
@/*          → src/*   (fallback)
```

Úsalos siempre. Nada de `../../../`.

## Estructura

```
app/(tabs)/         home, microjuegos, cuentos, perfil  (Expo Router)
src/core/sudoku/    prng, validator, solver, generator, difficulty, progress  (puro)
src/core/symbols/   packs de símbolos (numbers, colors, ...)
src/features/<x>/   sudoloco | versus-islas | versus-mar | cuento | historia | microjuegos | auth
src/ui/             Board, Cell, NumberPad, ProgressBar, SudokuBackground, primitives
src/services/       firebase/, storage/ (mmkv + secure)
src/providers/      AppProviders, QueryProvider
src/theme/colors.ts · src/i18n/ · src/lib/env.ts
```

## Estado actual (verificar con git si tienes dudas)

- **Fase 0 ✅** Infraestructura completa (Expo Router, NativeWind, Firebase client, i18n, providers, tipos, lint/format).
- **Fase 1 ✅** Núcleo Sudoku completo, 61 tests Jest pasando (prng, validator, solver, generator, difficulty, progress).
- **Fase 2 ✅** UI base del tablero (`Board`, `Cell`, `NumberPad`, `ProgressBar`).
- **UI menú principal ⏸️** En pausa con avances. `home.tsx` con título, 4 botones pixel-art y `SudokuBackground` (cascada de números reactiva al acelerómetro). Pendiente: conectar navegación de botones, tipografía pixel, decidir reutilización del fondo, pausar acelerómetro al perder foco.
- **Fase 3 — siguiente.** Modo Sudoloco (roguelike). Por hacer: `core/sudoku/progression.ts`, `core/sudoku/rewards.ts`, `features/sudoloco/store.ts` (Zustand con `RunState` + `BoardState` separados desde el inicio), `features/sudoloco/screen.tsx`, HUD, persistencia MMKV, pantalla game over.

Lista completa de fases en [ARCHITECTURE.md §12-13](ARCHITECTURE.md).

## Mecánicas del modo Sudoloco (Fase 3)

```ts
RunState { level, lives, timeRemaining, score, hints, goldenCells, phase }
```

- Inicio: `lives = 3`, `timeRemaining = 180s`, `score = 0`.
- Celda correcta suma segundos por dificultad: **beginner +4s · intermediate +3s · hard +2s · expert +2s**.
- Celda incorrecta: `lives--`. Sin vidas o sin tiempo → game over.
- Puntuación: celda correcta `10 × (floor(level/5)+1)`, puzzle completo `500 × level`.
- Progresión: niveles 1–3 beginner · 4–7 intermediate · 8–12 hard · 13+ expert.
- El timer **se acumula** entre puzzles, no resetea.
- Highscore → Firestore `/users/{uid}/stats.highscore` (Fase 4).

## Multijugador en Spark (sin Cloud Functions)

- **Versus Islas**: solo se sincroniza `progress[uid]` (0..100) en Firestore. El tablero es determinista por seed, ambos clientes lo generan localmente.
- **Versus Mar**: estado en RTDB `/liveMatches/{matchId}`. Validación en Security Rules + `runTransaction()`. Cliente-autoritativo (trade-off aceptado).

## Modelo de datos

Firestore: `/users/{uid}`, `/matches/{matchId}`, `/storyChapters/{chapterId}`. RTDB: `/liveMatches/{matchId}`. Esquemas completos en [ARCHITECTURE.md §4](ARCHITECTURE.md).

## Comandos

```bash
npm start              # Metro
npm run android        # build + lanzar (el usuario corre Android Studio)
npm run typecheck      # tsc --noEmit
npm run lint[:fix]     # ESLint
npm run format         # Prettier
npm test               # Jest (solo core, sin RN)
```

## Cómo trabajar en este repo

- **Antes de implementar algo nuevo**, verifica si la lógica pertenece a `core/` (sin deps de RN/Firebase) o a una feature. Si es lógica de sudoku, va a `core/` con tests Jest.
- **Tests primero para `core/`.** Cualquier código en `src/core/sudoku/` debe tener tests en `__tests__/`.
- **No crear archivos de documentación** (planes, resúmenes, decisiones) salvo que el usuario lo pida explícitamente. `ARCHITECTURE.md` es el documento vivo del proyecto.
- **Plan Spark = sin Cloud Functions.** No proponer arquitecturas que requieran Blaze sin avisar.
- **Determinismo del generador es contractual.** No introducir `Math.random()` ni `Date.now()` en `core/sudoku/`. Todo entra por el PRNG con seed.
- El usuario usa **Windows + PowerShell**, no Bash. Para rutas y comandos del shell, usa sintaxis PowerShell.
- El usuario prueba en **Android Studio** (emulador / dispositivo Android). iOS no es prioridad inmediata.

## Cuándo preguntar antes de actuar

- Decisiones de diseño no escritas en ARCHITECTURE.md (p. ej. nueva mecánica, cambio de modelo de datos).
- Tocar Security Rules de Firebase.
- Borrar/renombrar archivos fuera del scope de la tarea.
- Instalar dependencias nuevas.

## Decisiones pendientes (ver §17 de ARCHITECTURE.md)

Reglas de Firestore antes de Fase 4 · imágenes de cuentos (Storage vs bundled) · onboarding · analytics · EAS Build.
