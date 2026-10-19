# Sudoloco — guía para Claude

> Resumen operativo. Fuente de verdad detallada: [ARCHITECTURE.md](ARCHITECTURE.md) — consúltala antes de decisiones de diseño.

## Proyecto

App móvil (Expo + RN) de Sudoku con varios modos:

- **Sudoloco** (principal, roguelike): run infinita, 3 vidas, timer acumulado entre puzzles, celda correcta suma segundos. Game over sin vidas o timer en 0. Objetivo: batir highscore propio. Al terminar la run se canjean monedas (según score) → persisten en perfil, se gastan en tienda.
- **Versus Islas**: async, mismo seed, cada quien resuelve el suyo, solo se sincroniza % avance.
- **Versus Mar**: tiempo real sobre el mismo tablero (RTDB), puntos por celda correcta colocada primero.
- **Cuento**: sudoku revela 9 imágenes en orden al completar cada caja.
- **Historia**: cuentos por capítulos (1 sudoku = 1 capítulo).
- **Microjuegos**: al completar caja sale minijuego estilo WarioWare; recompensas (score/vida/hint/golden cell) solo afectan `RunState` en Sudoloco. Desbloqueo aleatorio.
- **Biblioteca**: galería de cuentos completados + centro de customización (pack de símbolos activo, a futuro skin de tablero) + entrada a la tienda.

## Motor de Sudoku compartido (el corazón — 3 capas)

Todos los modos comparten el mismo motor. **Nunca reimplementes lógica de sudoku dentro de un modo.**

1. `src/core/sudoku/` (puro, Fase 1 ✅): generator · solver · validator · progress · difficulty · hints.ts (`revealCandidate`, `pickHintCell`, `revealRandomCell`). `src/core/symbols/` = packs (numbers, colors, figures, sprites).
2. `src/ui/SudokuGame/` (capa compartida, Fase 3): `createSudokuGameStore(opts)` → factory Zustand (state: board, selectedIndex, notes, errorIndices, hintsRemaining, goldenRemaining, isComplete; actions: select, place, toggleNote, useHint, useGoldenCell, clear; callbacks que los modos suscriben: onCellCorrect, onCellIncorrect, onBoxComplete, onPuzzleComplete). `<SudokuGame store pack />` compone Board + NumberPad + botones hint/golden.
3. `src/features/<modo>/`: solo HUD propio, overlays, reglas del modo. Consume el motor vía store + callbacks.

Reglas del motor:
- Store guarda `1..9`; `SymbolPack` es solo render (prop de `<SudokuGame pack={...} />`) — cambiar pack = cero refactor.
- **Store factory, no singleton** (necesario para Versus Mar con dos tableros simultáneos).
- Los modos no leen el tablero del store para decisiones de modo — solo escuchan callbacks.
- Pistas (`useHint`) revelan candidatos correctos; casilla dorada (`useGoldenCell`) revela el valor exacto. Lógica en `core/sudoku/hints.ts`.
- Errores: store mantiene `Set<number>` de índices, llenado por `place()` vía `validator.validateMove`.
- Determinismo: el motor recibe el `Puzzle` ya generado por `core/sudoku/generate(difficulty, seed)`. Nunca `Math.random()`.

## Economía y customización

Monedas en `/users/{uid}/wallet.coins`, ganadas solo al final de una run de Sudoloco (fórmula en `core/sudoku/economy.ts`, puro/testeable). Tienda (en `features/biblioteca/` o `features/shop/`) vende packs/skins; compra registra `id` en `/users/{uid}/unlocked.symbolPacks[]` (o `boardSkins[]`). Packs: `numbers`/`colors` gratis, `figures`/`sprites` desbloqueables (`core/symbols/packs.ts`). Skins de tablero: fase futura, irán en `core/board-skins/` con misma arquitectura. Selección activa en `/users/{uid}/active.symbolPackId`, editable desde Biblioteca.

## Idioma

Usuario habla español → responde en español. Strings de UI siempre vía `t('clave')` (i18n es/en), nunca literales en JSX.

## Stack

Expo SDK 54 · RN 0.81 · React 19 · TS estricto (`noUncheckedIndexedAccess`) · Expo Router (file-based, typedRoutes) · NativeWind 4 · Reanimated 4 · Zustand (1 store/feature) · TanStack Query · Firebase Spark (Auth+Firestore+RTDB+Storage, **sin Cloud Functions**) · Zod · AsyncStorage + SecureStore (no MMKV) · i18next.

## Reglas de oro (no romper)

1. `src/core/` es lógica pura — no importa RN, Expo ni Firebase. Testeable con Jest sin emuladores.
2. Las features no se importan entre sí — lo compartido sube a `core/`, `ui/`, `services/` o `lib/`.
3. `services/` es la única vía a Firebase — features usan repositorios (`users.repo.ts`, etc.), nunca `firestore` directo.
4. Una store de Zustand por feature. Sin store global.
5. Estado remoto → React Query. Estado de UI → Zustand. No mezclar.
6. Datos de Firestore pasan por Zod antes de tipearlos.
7. i18n desde el día 1 — sin strings literales en JSX.
8. Sin comentarios salvo que el *por qué* no sea obvio. Nombres descriptivos > comentarios.

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

## Estado actual (verificar con git si hay dudas)

Fase 0 ✅ infra · Fase 1 ✅ núcleo sudoku (152 tests) · Fase 2 ✅ UI base del tablero · UI menú principal ⏸️ pausado (falta conectar navegación, tipografía pixel, pausar acelerómetro al perder foco) · **Fase 3 — siguiente**: Sudoloco roguelike, plan detallado en [docs/superpowers/plans/2026-05-31-fase-3-sudoloco-roguelike.md](docs/superpowers/plans/2026-05-31-fase-3-sudoloco-roguelike.md). Fases completas en [ARCHITECTURE.md §12-13](ARCHITECTURE.md).

## Mecánicas de Sudoloco (Fase 3)

`RunState { level, lives, timeRemaining, score, hints, goldenCells, phase }`. Inicio: lives=3, timeRemaining=180s, score=0. Celda correcta suma seg. por dificultad (beginner +4 · intermediate +3 · hard +2 · expert +2) y puntos `10×(floor(level/5)+1)`; completar puzzle suma `500×level`. Celda incorrecta: lives--. Game over sin vidas o sin tiempo. Niveles: 1–3 beginner · 4–7 intermediate · 8–12 hard · 13+ expert. Timer se acumula entre puzzles, no resetea. Highscore → Firestore `/users/{uid}/stats.highscore` (Fase 4).

## Multijugador en Spark (sin Cloud Functions)

Versus Islas: solo se sincroniza `progress[uid]` (0..100) en Firestore, tablero determinista por seed generado en cliente. Versus Mar: estado en RTDB `/liveMatches/{matchId}`, validación en Security Rules + `runTransaction()`, cliente-autoritativo (trade-off aceptado).

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

- Antes de implementar algo nuevo, verifica si va en `core/` (sin deps RN/Firebase) o en una feature. Lógica de sudoku → `core/` con tests Jest.
- Microjuegos: antes de tocar `src/features/microgames/`, lee [su README](src/features/microgames/README.md) (contrato, registro, assets).
- Tests primero para `core/`: todo código en `src/core/sudoku/` necesita tests en `__tests__/`.
- No crear archivos de documentación (planes, resúmenes) salvo que el usuario lo pida. `ARCHITECTURE.md` es el documento vivo.
- No hacer commits salvo que el usuario lo pida.
- Plan Spark = sin Cloud Functions; no proponer arquitecturas que requieran Blaze sin avisar.
- Determinismo del generador es contractual: nada de `Math.random()`/`Date.now()` en `core/sudoku/`, todo vía PRNG con seed.
- Usuario en **Windows + PowerShell** (no Bash) — usa sintaxis PowerShell para shell/rutas.
- Usuario prueba en **Android Studio** (emulador/dispositivo). iOS no es prioridad.

## Cuándo preguntar antes de actuar

- Decisiones de diseño no escritas en ARCHITECTURE.md (nueva mecánica, cambio de modelo de datos).
- Tocar Security Rules de Firebase.
- Borrar/renombrar archivos fuera del scope de la tarea.
- Instalar dependencias nuevas.

## Decisiones pendientes (ver §17 de ARCHITECTURE.md)

Reglas de Firestore antes de Fase 4 · imágenes de cuentos (Storage vs bundled) · onboarding · analytics · EAS Build · precio IAP "sin anuncios" · mecánica de crystal_heart.
