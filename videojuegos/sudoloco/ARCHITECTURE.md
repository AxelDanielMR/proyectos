# Arquitectura — Sudoloco

Guía de la arquitectura del proyecto y los siguientes pasos. Pensada para que cualquier persona (o tu yo de dentro de tres meses) entienda dónde va cada cosa y por qué.

---

## 1. Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Runtime | Expo SDK 54, React Native 0.81, React 19 | New Architecture habilitada |
| Lenguaje | TypeScript estricto (`noUncheckedIndexedAccess`) | |
| Navegación | Expo Router (file-based, `app/`) | `typedRoutes` activado |
| UI | NativeWind 4 + Reanimated 4 | Tailwind para RN |
| Estado global | Zustand (por feature, sin store monolítica) | |
| Datos backend | TanStack React Query | Caché + refetch + optimistic |
| Backend | Firebase **Spark (gratis)** | Auth + Firestore + Realtime DB + Storage |
| Validación runtime | Zod | env y datos de Firestore |
| Almacenamiento local | MMKV (rápido, síncrono) + SecureStore (tokens) | |
| i18n | i18next + react-i18next + expo-localization | `es` y `en` |
| Calidad | ESLint (config Expo) + Prettier + tsc | |

> **Plan Spark (sin Cloud Functions)**: La validación de movimientos en "Versus Mar" se hace con **Realtime Database Security Rules** + transacciones cliente. Más detalle en §5.

---

## 2. Estructura de carpetas

```
sudoloco/
├── app/                          # Rutas (Expo Router)
│   ├── _layout.tsx               # Root: providers + Stack
│   ├── index.tsx                 # Redirect inicial → /home
│   └── (tabs)/
│       ├── _layout.tsx           # Tab bar
│       ├── home.tsx              # Selección de modos
│       ├── microjuegos.tsx
│       ├── cuentos.tsx
│       └── perfil.tsx
│
├── src/
│   ├── core/                     # Lógica pura, SIN React Native ni Firebase
│   │   ├── sudoku/               # Generador, solver, validator, tipos
│   │   └── symbols/              # Packs de símbolos (números, colores, etc.)
│   │
│   ├── features/                 # Una carpeta por feature de negocio
│   │   ├── auth/                 # Login, registro, perfil
│   │   ├── sudoloco/             # Modo principal
│   │   ├── versus-islas/         # Multijugador asíncrono
│   │   ├── versus-mar/           # Multijugador en tiempo real
│   │   ├── cuento/               # Sudoku que cuenta una historia
│   │   ├── historia/             # Cuentos por capítulos
│   │   └── microjuegos/          # Registry + runner warioware
│   │
│   ├── ui/                       # Componentes reutilizables, agnósticos
│   │   └── primitives/           # Button, etc.
│   │
│   ├── services/                 # Acceso a backends externos
│   │   ├── firebase/             # client (auth, firestore, RTDB)
│   │   └── storage/              # mmkv + secure-store
│   │
│   ├── providers/                # AppProviders, QueryProvider
│   ├── theme/                    # tokens de color
│   ├── i18n/                     # i18next + locales/es.json, en.json
│   └── lib/                      # env validation, utilidades
│
├── assets/                       # imágenes, sprites, ilustraciones
├── .env / .env.example           # config de Firebase
└── ARCHITECTURE.md               # este archivo
```

### Path aliases (`tsconfig.json`)

```ts
import { Button } from '@ui/primitives';
import { firestore } from '@services/firebase';
import { env } from '@lib/env';
import i18n from '@i18n/index';
import { colors } from '@theme/colors';
import type { Difficulty } from '@core/sudoku';
```

También `@/*` → `src/*` como alias genérico de respaldo.

---

## 3. Reglas de oro

1. **`core/` no importa nada de React Native ni Firebase.** Es matemática pura, testeable con Jest sin emuladores. Todo lo que pueda vivir aquí, vive aquí.
2. **Las features no se importan entre sí.** Si dos features comparten algo, ese algo sube a `core/`, `ui/`, `services/` o `lib/`.
3. **`services/` es la única vía de acceso a Firebase.** Las features llaman a repositorios (`users.repo.ts`, `matches.repo.ts`), nunca a `firestore` directamente.
4. **Una store de Zustand por feature.** Nunca una store global. Esto evita re-renders en cascada y mantiene cada feature autónoma.
5. **Datos del backend → React Query.** Estado de UI → Zustand. No mezcles.
6. **Validar al entrar.** Datos de Firestore se validan con Zod antes de tipearlos. Confías en lo que ya está dentro del sistema.
7. **i18n desde el día 1.** Nunca strings literales en JSX — siempre `t('clave')`.

---

## 4. Modelo de datos

### Firestore (`firestore`)

```
/users/{uid}
  displayName, email, symbolPackId, difficultyPreferred,
  unlockedMicrogames[], cuentosCompleted[], historiaProgress,
  stats: { wins, losses, totalGames, highscore }, createdAt, updatedAt

/matches/{matchId}                # Versus Islas
  mode, hostId, guestId, code, difficulty, seed,
  status: 'waiting'|'playing'|'finished',
  progress: { [uid]: 0..100 },
  startedAt, finishedAt, winnerId

/storyChapters/{chapterId}
  order, title, images: [{ order, url, text }]
```

### Realtime DB (`realtimeDb`) — solo Versus Mar

```
/liveMatches/{matchId}
  board: number[81]
  scores: { [uid]: number }
  lastMove: { uid, index, value, ts }
  presence: { [uid]: { online, lastSeen } }
```

**Por qué Realtime DB y no Firestore para Mar**: latencia menor, costo por write más bajo en escenarios de alta frecuencia, presencia integrada.

---

## 5. Multijugador en plan gratuito (sin Cloud Functions)

### Versus Islas (asíncrono)
- Ambos clientes comparten el `seed`. Cada uno **genera localmente** el mismo tablero (el generador es determinista).
- Solo se sincroniza `progress[uid]` (un número 0..100) cada N celdas, throttled.
- Trivial, casi gratis en Firestore.

### Versus Mar (tiempo real)
- Estado en Realtime DB: `/liveMatches/{matchId}`.
- **Validación en Security Rules** (no en código de cliente):
  - Solo participantes pueden escribir.
  - Un movimiento solo es válido si `index` está vacío y el `value` coincide con la solución (la solución se guarda hasheada en `/matches/{id}/solutionHash` y la regla compara con el hash del valor + índice + sal del partido — esto evita que el cliente reciba la solución completa).
  - **Alternativa más simple**: enviar el valor; la regla acepta cualquier escritura sobre celda vacía y se confía en el cliente. Se usa `runTransaction()` para evitar dobles writes.
- Cada movimiento válido incrementa `scores[uid]` en una transacción.
- **Trade-off**: cliente-autoritativo. Aceptable porque el peor abuso es trampa entre amigos, no riesgo de seguridad.

> Si más adelante se sube a Blaze, se mueve la validación a una Cloud Function y se elimina la dependencia del hashing.

---

## 6. Motor de Sudoku (`src/core/sudoku/`)

API objetivo (a implementar en Fase 1):

```ts
generate(difficulty: Difficulty, seed: string): Puzzle
solve(board: Board): Board | null
hasUniqueSolution(board: Board): boolean
validateMove(board, index, value): MoveResult
detectBoxCompletion(prev: Board, next: Board): number | null  // 0..8 o null
computeProgress(board, solution): number  // 0..100
```

**Dificultad** = combinación de `(número de pistas, técnicas requeridas para resolver)`:

| Nivel | Pistas | Técnicas |
|---|---|---|
| Principiante | 36–40 | naked singles |
| Intermedio | 30–35 | hidden singles |
| Difícil | 26–29 | pointing pairs, box-line |
| Experto | 22–25 | X-wing, swordfish |

**Generador determinista por seed**: misma seed → mismo tablero. Esto habilita Versus Islas sin transmitir el tablero completo.

---

## 7. Modo Sudoloco — Mecánicas roguelike

### Run state

La sesión es una **run infinita**: siempre termina en game over. El objetivo es superar el propio highscore.

```ts
interface RunState {
  level: number;         // número de puzzle en la run (empieza en 1)
  lives: number;         // vidas restantes (inicio: 3)
  timeRemaining: number; // segundos en el contador
  score: number;         // puntuación acumulada (persiste como highscore)
  hints: number;         // usos de pista disponibles
  goldenCells: number;   // usos de casilla dorada disponibles
  phase: 'playing' | 'microgame' | 'between_levels' | 'gameover';
}
```

### Condiciones de fin de run

| Condición | Efecto |
|---|---|
| `timeRemaining === 0` | Game over inmediato |
| `lives === 0` | Game over inmediato |
| Colocar número incorrecto | `lives--` |

### Timer (se acumula entre puzzles)

- El timer **no resetea** al completar un nivel — se acumula durante toda la run.
- Cada celda correctamente colocada añade tiempo según la dificultad del nivel:

| Dificultad | Segundos por celda correcta |
|---|---|
| beginner | +4 s |
| intermediate | +3 s |
| hard | +2 s |
| expert | +2 s |

- Timer inicial al empezar una run: **180 s** (definido en `core/sudoku/progression.ts`).

### Progresión de dificultad

```
Niveles 1–3:   beginner      (36–40 pistas)
Niveles 4–7:   intermediate  (30–35 pistas)
Niveles 8–12:  hard          (26–29 pistas)
Nivel 13+:     expert        (22–25 pistas)
```

Encapsulado en `core/sudoku/progression.ts`: `levelConfig(level) → { difficulty, secsPerCell }`.

### Puntuación

| Evento | Puntos |
|---|---|
| Celda correcta colocada | `10 × (floor(level / 5) + 1)` |
| Puzzle completado | `500 × level` |
| Recompensa de microjuego (score) | variable (ver §8) |

El highscore final se guarda en Firestore (`/users/{uid}/stats.highscore`).

---

## 8. Microjuegos (plugin registry)

Cada microjuego es un módulo autocontenido que implementa:

```ts
interface Microgame {
  id: string;
  name: string;
  durationMs: number;
  Component: React.FC<{ onResult: (r: 'win'|'lose'|'timeout') => void }>;
}
```

Se registran en `src/features/microjuegos/registry.ts`. Agregar un microjuego = una sola línea de import + `registerMicrogame(...)`. El runner los selecciona aleatoriamente, prefiriendo los **no descubiertos** del usuario, y persiste el `id` en `unlockedMicrogames` cuando aparecen por primera vez.

### Recompensas tipadas

Al ganar un microjuego, el runner llama a `rollReward(level, rng)` (de `core/sudoku/rewards.ts`) y aplica el resultado al `RunState`:

```ts
type Reward =
  | { kind: 'score'; amount: number }
  | { kind: 'life' }
  | { kind: 'hint' }
  | { kind: 'golden_cell' }
  | { kind: 'none' };
```

Perder o agotar el tiempo → `{ kind: 'none' }`.

### Tabla de probabilidades (interpolada por nivel)

| Recompensa | Nivel 1 | Nivel 10 | Nivel 20+ |
|---|---|---|---|
| score bonus | 40 % | 37 % | 33 % |
| hint (+1) | 25 % | 27 % | 29 % |
| golden cell | 5 % | 7 % | 10 % |
| extra life | 5 % | 7 % | 10 % |
| none | 25 % | 22 % | 18 % |

Las recompensas más fuertes escalan lentamente hacia arriba. La lógica de interpolación vive en `core/sudoku/rewards.ts` (pura, testeable).

---

## 9. Estado y caché

| Tipo de estado | Solución |
|---|---|
| UI local de un componente | `useState` |
| Estado de una feature (tablero en juego, modo) | Zustand (una store por feature) |
| Run state completa roguelike (sobrevive cierre) | Zustand + MMKV |
| Datos remotos (perfil, partidas, capítulos) | React Query |
| Tokens, secrets | SecureStore |
| Idioma seleccionado | MMKV |

---

## 10. Variables de entorno

`.env` (no se commitea) y `.env.example` (sí se commitea).

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
```

`src/lib/env.ts` valida con Zod al cargar la app — falla rápido si falta algo.

---

## 11. Comandos comunes

```bash
npm start                 # Metro
npm run android           # Build + lanzar en device/emulador
npm run ios               # iOS (macOS solamente)
npm run typecheck         # tsc --noEmit
npm run lint              # ESLint
npm run lint:fix          # ESLint --fix
npm run format            # Prettier write
npm test                  # Jest (core)
npm run test:coverage     # Jest con cobertura
```

---

## 12. Estado actual

### Fase 0 ✅ — Infraestructura

- [x] Expo Router con tabs (`home`, `microjuegos`, `cuentos`, `perfil`)
- [x] NativeWind 4 + Reanimated 4 funcionando
- [x] Estructura `src/` completa con `core / features / ui / services / lib / theme / i18n / providers`
- [x] Firebase client (Auth + Firestore + Realtime DB) con env validado por Zod
- [x] i18n con `es` y `en` (detección automática)
- [x] Providers: i18n, React Query, SafeArea
- [x] Tipos base de Sudoku y packs de símbolos (`numbers`, `colors`)
- [x] Componente `Button` de ejemplo en `ui/primitives`
- [x] Registry de microjuegos
- [x] ESLint + Prettier + tsconfig estricto + path aliases
- [x] Bundle Android verificado (`expo export` exitoso)

### Fase 1 ✅ — Núcleo Sudoku (61 tests)

- [x] `core/sudoku/prng.ts` — PRNG determinístico por seed (FNV-1a + xorshift)
- [x] `core/sudoku/validator.ts` — peers pre-computados, `isValid`, `validateMove`, `isBoardSolved`
- [x] `core/sudoku/solver.ts` — backtracking + MRV heurístico, `countSolutions`, `hasUniqueSolution`
- [x] `core/sudoku/generator.ts` — genera tablero determinista por seed, unicidad garantizada
- [x] `core/sudoku/difficulty.ts` — rangos de pistas por dificultad
- [x] `core/sudoku/progress.ts` — `computeProgress`, `detectBoxCompletion`
- [x] Tests Jest: **61/61** ✅

### Fase 2 ✅ — UI base

- [x] `ui/Board/` — grilla 9×9, borders thin/thick, peer highlighting
- [x] `ui/Cell/` — estados (fixed, selected, peer, error), notas 3×3, animaciones Reanimated
- [x] `ui/NumberPad/` — teclado 3×3 adaptable a SymbolPack, controles notas/borrar
- [x] `ui/ProgressBar/` — barra animada por pixel width
- [x] `theme/colors.ts` — token `cellBgPeer` añadido

---

## 13. Siguientes pasos

### Fase 3 — Modo Sudoloco (roguelike, sin UI nueva aún)

1. `core/sudoku/progression.ts` — `levelConfig(level): { difficulty, secsPerCell }` + constante `INITIAL_TIME_S`. Tests Jest.
2. `core/sudoku/rewards.ts` — `rollReward(level, rng): Reward` con tabla interpolada. Tests Jest.
3. `features/sudoloco/store.ts` (Zustand) — dos slices:
   - `RunState`: level, lives, timeRemaining, score, hints, goldenCells, phase.
   - `BoardState`: board, selectedIndex, notes, errorIndices.
   - Timer vía `setInterval` dentro del store (start/stop según `phase`).
4. `features/sudoloco/screen.tsx` — HUD (vidas, timer, score) + tablero + teclado + lógica de transición entre levels.
5. `ui/HUD/` — `LivesDisplay`, `TimerDisplay`, `ScoreDisplay` (componentes sin estado, solo props).
6. Persistencia de run en MMKV (sobrevive cierre de app).
7. Pantalla de game over con highscore local (Firestore en Fase 4).

### Fase 4 — Auth + perfil

8. Pantallas de registro/login con Firebase Auth (email + password).
9. `services/firebase/users.repo.ts` — CRUD de perfil.
10. Guardar highscore en Firestore (`/users/{uid}/stats.highscore`).
11. Perfil: pack de símbolos preferido.

### Fase 5 — Microjuegos

12. Implementar 3–5 microjuegos iniciales (tap-fast, memory-flash, simon, etc.).
13. `runner.tsx` — overlay que aparece al completar caja, lanza microjuego, aplica `Reward` al `RunState` vía `rollReward`.
14. Persistencia de `unlockedMicrogames` en perfil.

### Fase 6 — Cuento

15. Modelo `StoryChapter` en Firestore + seed con un cuento de prueba.
16. Pantalla de partida con overlay de imagen tras cada caja.
17. Vista de carrusel al completar.

### Fase 7 — Historia

18. Lógica de capítulos, progresión, menú de capítulos.

### Fase 8 — Versus Islas

19. Sistema de códigos de partida (Firestore docs con TTL).
20. Sistema de amigos (subcolección `/users/{uid}/friends`).
21. Throttled progress sync.

### Fase 9 — Versus Mar

22. Reglas de seguridad RTDB (validación de movimientos).
23. Transacciones de movimiento + scoring.
24. Indicadores de presencia.

### Fase 10 — UI mejorada + pulido

25. Nueva UI del tablero (diseño pendiente).
26. Animaciones de celebración al completar puzzle/caja, sonidos, haptics.
27. Onboarding.
28. Builds EAS para producción (Android primero, iOS después).

---

## 14. Decisiones pendientes (cuando toquen)

- **Firestore Security Rules**: definir antes de Fase 4. Sin reglas, el plan gratuito está expuesto.
- **Imágenes de cuentos/historia**: ¿Firebase Storage o assets bundled? Storage permite actualizar sin redeploy; bundled funciona offline.
- **Onboarding** y selección inicial de pack de símbolos.
- **Analytics**: Firebase Analytics está incluido en Spark, falta decidir qué medir.
- **EAS Build**: configurar `eas.json` y perfiles `development` / `preview` / `production` antes de Fase 10.
