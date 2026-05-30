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
  displayName:    string | null      ← null mientras sea anónimo
  email:          string | null      ← null mientras sea anónimo
  isAnonymous:    boolean
  createdAt:      Timestamp

  stats:
    highscore:    number
    bestLevel:    number             ← nivel máximo alcanzado en una run

  wallet:
    coins:        number

  unlocked:
    symbolPackIds:  string[]         ← vacío por defecto (numbers y colors son gratis)
    microgameIds:   string[]         ← se añade al descubrir cada microjuego por primera vez

  active:
    symbolPackId:  string            ← 'numbers' por defecto

/matches/{matchId}                # Versus Islas
  mode, hostId, guestId, code, difficulty, seed,
  status: 'waiting'|'playing'|'finished',
  progress: { [uid]: 0..100 },
  startedAt, finishedAt, winnerId

/storyChapters/{chapterId}
  order, title, images: [{ order, url, text }]
```

**Lo que NO va a Firestore:**
- Run activa (timer, vidas, board) → MMKV exclusivamente
- `hasRemovedAds` → RevenueCat lo gestiona
- Progreso de Historia/Cuento → se añadirá como `completedChapterIds: string[]` cuando existan esas features
- Stats detalladas (errores totales, etc.) → decidir al implementar analytics

**Writes por sesión típica:** 1 (al terminar run si highscore o coins cambiaron) + ocasionalmente al desbloquear microjuego/pack. Gratis en Spark hasta ~4,000 DAU.

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

## 5. Auth anónimo y registro opcional

### Filosofía
El usuario entra directo al juego sin ninguna pantalla de login. Firebase asigna un UID anónimo silenciosamente. El registro es opcional y se ofrece en momentos contextuales. Si el usuario nunca se registra y desinstala la app, sus datos se pierden — esto se comunica en la UI como incentivo a registrarse.

### Flujo

```
Primera apertura
  → signInAnonymously() silencioso
  → Crea /users/{uid} en Firestore con datos vacíos (isAnonymous: true)
  → Entra directo al home

Nudges contextuales (no bloqueantes):
  → Pantalla game over: "¿Quieres conservar tu progreso? Regístrate"
  → Tab Perfil: estado "Jugando como invitado" + botón "Crear cuenta"

Al registrarse (voluntario):
  → linkWithCredential(EmailAuthProvider.credential(email, password))
  → El UID anónimo se convierte en permanente — Firestore sin migración
  → Actualiza displayName, email, isAnonymous: false en el documento

Si reinstala sin haberse registrado:
  → UID anónimo perdido → datos perdidos (comportamiento esperado y comunicado)

Si reinstala habiendo registrado:
  → Login con email/password → recupera todos sus datos de Firestore
```

### Estados de AuthStatus

```ts
type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unauthenticated';
// 'unauthenticated' solo durante el signInAnonymously inicial o tras signOut explícito
```

### Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `app/_layout.tsx` (AuthGuard) | Llama a `signInAnonymously` si no hay usuario; no redirige a login |
| `features/auth/store.ts` | Añade estado `'anonymous'`; acción `linkAccount(email, password)` |
| `app/(auth)/login.tsx` | Solo accesible desde perfil o nudge, no como gate obligatorio |
| `app/(auth)/register.tsx` | Usa `linkWithCredential` si hay sesión anónima; crea cuenta nueva si no |

---

## 5b. Anuncios (AdMob) + compra "sin anuncios" (RevenueCat)

### Librerías
- `react-native-google-mobile-ads` — intersticiales AdMob
- `react-native-purchases` — RevenueCat IAP (pago único, gestiona recibos y restore purchases)
- Instalar solo en **Fase 9** — requieren config nativa y cuentas en AdMob/RevenueCat/Google Play Console

### Regla de frecuencia

```ts
// src/features/ads/adGate.ts — lógica pura, testeable sin RN
function shouldShowAd(
  trigger: 'puzzle_complete' | 'game_over',
  puzzlesSinceLastAd: number,
): boolean {
  if (trigger === 'game_over') return true;           // siempre en game over
  return puzzlesSinceLastAd >= 3;                     // cada 3 puzzles durante la run
}
```

Usuarios con entitlement "sin anuncios": `shouldShowAd` nunca se ejecuta.

### Entitlement "sin anuncios"
RevenueCat gestiona el recibo del pago único y el restore purchases. `useHasRemovedAds()` consulta RevenueCat — funciona tras reinstalar sin tocar Firestore.

### Estructura

```
src/features/ads/
  adGate.ts       # shouldShowAd — lógica pura
  useAds.ts       # hook: preload + show intersticial
  useIAP.ts       # hook: comprar "sin anuncios" + restaurar compra
```

El `RunStore` de Sudoloco mantiene `puzzlesSinceLastAd: number`: incrementa en `onPuzzleComplete`, resetea a 0 al mostrar un anuncio.

### Análisis de rentabilidad (referencia LATAM, CPM ~$1)

| DAU | Impresiones/día (cap 3) | Ingreso/mes |
|---|---|---|
| 1,000 | ~2,500 | ~$75 |
| 10,000 | ~25,000 | ~$750 |

Costo Firestore con modelo mínimo: < $1/mes hasta 10,000 DAU.

---

## 6. Multijugador en plan gratuito (sin Cloud Functions)

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

API objetivo:

```ts
// Fase 1 ✅ — ya implementado
generate(difficulty: Difficulty, seed: string): Puzzle
solve(board: Board): Board | null
hasUniqueSolution(board: Board): boolean
validateMove(board, index, value): MoveResult
detectBoxCompletion(prev: Board, next: Board): number | null  // 0..8 o null
computeProgress(board, solution): number  // 0..100

// Fase 3 — pendiente, vive en core/sudoku/hints.ts
pickHintCell(board, solution, rng): number              // elige celda candidata para pista
revealCandidate(board, solution, idx): CellValue[]      // candidatos correctos para esa celda
revealGoldenCell(board, solution, rng): { idx: number; value: CellValue }
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

Al ganar un microjuego, el runner llama a `rollReward(level, rng)` (de `core/sudoku/rewards.ts`) y aplica el resultado al `RunState`. Las recompensas son exclusivamente de **supervivencia y utilidad** — no de puntuación (el score ya se gana colocando celdas correctamente):

```ts
type Reward =
  | { kind: 'time'; amount: number }
  | { kind: 'hint' }
  | { kind: 'silver_cell' }
  | { kind: 'golden_cell' }
  | { kind: 'life' }
  | { kind: 'crystal_heart' }
  | { kind: 'none' };
```

Perder o agotar el tiempo → `{ kind: 'none' }`.

### Tabla de probabilidades (interpolada por nivel)

| Recompensa | Nivel 1 | Nivel 20+ |
|---|---|---|
| time (+segundos) | 26 % | 22 % |
| hint (+1) | 18 % | 20 % |
| silver_cell | 12 % | 14 % |
| golden_cell | 4 % | 8 % |
| life (+1) | 5 % | 8 % |
| crystal_heart | 10 % | 8 % |
| none | 25 % | 20 % |

Las recompensas más fuertes (golden_cell, life) escalan hacia arriba con el nivel. La lógica de interpolación vive en `core/sudoku/rewards.ts` (pura, testeable).

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

### Fase UI Menú principal ⏸️ — **En pausa con avances** (se retomará luego)

Trabajo de presentación del menú principal en `app/(tabs)/home.tsx`. Pausado tras llegar a un look aceptable; pendiente conectar navegación y refinar tipografía/animaciones.

- [x] Assets pixel-art de los botones en [assets/buttons/](assets/buttons/) (`sudoloco.png`, `versus.png`, `history.png`, `library.png`)
- [x] `home.tsx` con título **SUDOLOCO**, divisor rojo y 4 botones (orden: Sudoloco → Versus → Historia → Biblio), responsivos vía `useWindowDimensions`
- [x] Tab bar inferior oculta (`tabBarStyle: { display: 'none' }` en `app/(tabs)/_layout.tsx`)
- [x] `ui/SudokuBackground/` — fondo crema con cuadrícula sudoku 3×3, degradado vertical (88% de altura, curva `pow 0.55`) y cascada de **22 partículas numéricas** ascendentes (Reanimated)
- [x] Cascada reactiva al **acelerómetro** (`expo-sensors`): siempre sube, eje X se inclina con el tilt (sensibilidad 0.35, cap 0.45, transición 400ms)
- [ ] Conectar `onPress` de cada botón a sus rutas (`expo-router`)
- [ ] Tipografía pixel para el título (¿`PressStart2P` vía `expo-font`?)
- [ ] Decidir si el fondo se reutiliza en otras pantallas (game over, perfil) o queda exclusivo del home
- [ ] Revisar consumo del acelerómetro y posibilidad de pausarlo cuando la pantalla pierde foco

---

## 13. Siguientes pasos

### Fase 3 — Motor compartido + Modo Sudoloco

**3a. Núcleo puro extra (`core/sudoku/`)**
1. `progression.ts` — `levelConfig(level): { difficulty, secsPerCell }` + `INITIAL_TIME_S`. Tests Jest.
2. `rewards.ts` — `rollReward(level, rng): Reward` con tabla interpolada (sin variante `score`). Tests Jest.
3. `hints.ts` — `pickHintCell`, `revealCandidate`, `revealGoldenCell`. Tests Jest.
4. `economy.ts` — `computeRunReward(score, level): { coins }`. Tests Jest.

**3b. Motor de juego compartido (`src/ui/SudokuGame/`)** — ver §15.
5. `store.ts` — `createSudokuGameStore(opts)`: estado + acciones + callbacks. Tests con Zustand vanilla.
6. `SudokuGame.tsx` — compone Board + NumberPad + botones hint/golden. Recibe `store` y `pack`.
7. `hooks.ts` — selectors finos (`useSelectedCell`, `useCellValue(idx)`, etc.) para evitar re-renders.

**3c. Modo Sudoloco (`src/features/sudoloco/`)**
8. `store.ts` (Zustand) — `RunState`: level, lives, timeRemaining, score, hints, goldenCells, coins, phase, puzzlesSinceLastAd. Timer vía `setInterval` start/stop según `phase`.
9. `screen.tsx` — HUD + `<SudokuGame />` + transiciones de nivel. Suscribe callbacks del motor para sumar tiempo/score/restar vidas/lanzar microjuego.
10. `ui/HUD/` — `LivesDisplay`, `TimerDisplay`, `ScoreDisplay` (sin estado).
11. Persistencia de run en MMKV.
12. Pantalla de game over: calcula coins con `economy.computeRunReward`, escribe highscore + coins en Firestore.

### Fase 4 — Auth anónimo + registro opcional

1. `AuthGuard` en `app/_layout.tsx`: reemplazar redirección a login por `signInAnonymously()` silencioso.
2. `features/auth/store.ts`: añadir estado `'anonymous'` y acción `linkAccount(email, password)` que usa `linkWithCredential`.
3. `services/firebase/users.repo.ts`: `createUserAnonymous(uid)` crea documento vacío en Firestore.
4. Pantalla de perfil: mostrar estado "Jugando como invitado" + botón "Crear cuenta".
5. Nudge en pantalla de game over: banner no bloqueante de registro.
6. `app/(auth)/register.tsx`: detectar si hay sesión anónima activa y usar `linkWithCredential` en lugar de `createUserWithEmailAndPassword`.

### Fase 5 — Microjuegos + Biblioteca básica (simultáneas)

**Microjuegos**
1. Implementar 3–5 microjuegos iniciales (tap-fast, memory-flash, simon, etc.).
2. `runner.tsx` — overlay que aparece al completar caja, lanza microjuego, aplica `Reward` al `RunState` vía `rollReward`.
3. Persistencia de `unlockedMicrogames` en perfil (Firestore `unlocked.microgameIds`).

**Biblioteca básica**
4. Tab Biblioteca: lista de microjuegos descubiertos (desbloqueados vs bloqueados).
5. Selector de pack de símbolos activo — lee `unlocked.symbolPackIds` y `active.symbolPackId` de Firestore.
6. Sección de tienda básica: muestra packs disponibles, permite comprar con coins (escribe en `unlocked.symbolPackIds`).

### Fase 6 — Versus Islas + Versus Mar

**Versus Islas**
1. Sistema de códigos de partida (Firestore docs con TTL).
2. Sistema de amigos (subcolección `/users/{uid}/friends`).
3. Throttled progress sync (`progress[uid]` 0..100 en Firestore).

**Versus Mar**
4. Reglas de seguridad RTDB (validación de movimientos).
5. Transacciones de movimiento + scoring con `runTransaction()`.
6. Indicadores de presencia.

### Fase 7 — Historia

1. Lógica de capítulos, progresión lineal, menú de capítulos.
2. Persistencia de `completedChapterIds` en Firestore.

### Fase 8 — Cuento

1. Modelo `StoryChapter` en Firestore + seed con un cuento de prueba.
2. Pantalla de partida con overlay de imagen tras cada caja completada.
3. Vista de carrusel al terminar el cuento.

### Fase 9 — Ads (AdMob) + IAP "sin anuncios" (RevenueCat)

1. Instalar `react-native-google-mobile-ads` y `react-native-purchases`.
2. `features/ads/adGate.ts` — `shouldShowAd(trigger, puzzlesSinceLastAd)`: pura, testeable.
3. `features/ads/useAds.ts` — preload + show intersticial.
4. `features/ads/useIAP.ts` — comprar "sin anuncios" + restaurar compra vía RevenueCat.
5. Integrar en pantalla game over y en `onPuzzleComplete` del RunStore.
6. Crear producto IAP en Google Play Console + configurar RevenueCat.

### Fase 10 — UI pulido + producción

1. Nueva UI del tablero (diseño pendiente).
2. Animaciones de celebración al completar puzzle/caja, sonidos, haptics.
3. Onboarding.
4. Configurar `eas.json` (perfiles `development`, `preview`, `production`).
5. Builds EAS para producción (Android primero, iOS después).

---

## 15. Motor de juego compartido (`src/ui/SudokuGame/`)

Capa intermedia que **todos los modos consumen**. Aísla la sesión de juego (selección, notas, errores, pistas, completitud) para que ningún modo reimplemente esa lógica.

### Estructura

```
src/ui/SudokuGame/
├── store.ts            # createSudokuGameStore(opts) — Zustand factory
├── SudokuGame.tsx      # <SudokuGame store pack /> — compone UI
├── hooks.ts            # useSudokuGame, selectors
├── types.ts            # SudokuGameOptions, SudokuGameCallbacks
└── index.ts
```

### Por qué `ui/` y no `features/`

- Es infraestructura compartida, no una feature de producto. Las features (modos) viven al consumirla.
- Convive con `Board`, `Cell`, `NumberPad` — los compone, no compite con ellos.
- Rendimiento: un solo nivel de import, Zustand selectors finos por celda evitan re-renders, store factory garantiza aislamiento entre instancias (necesario para Versus Mar).

### API del store

```ts
interface SudokuGameOptions {
  puzzle: Puzzle;                    // generado en core/sudoku
  initialHints?: number;             // default 0 (el modo decide)
  initialGoldenCells?: number;       // default 0
  rng: PRNG;                         // mismo PRNG del puzzle (determinismo)
  callbacks?: SudokuGameCallbacks;
}

interface SudokuGameCallbacks {
  onCellCorrect?: (idx: number, value: CellValue) => void;
  onCellIncorrect?: (idx: number, value: CellValue) => void;
  onBoxComplete?: (boxIndex: number) => void;        // 0..8
  onPuzzleComplete?: () => void;
}

interface SudokuGameState {
  board: Board;
  selectedIndex: number | null;
  notesByCell: ReadonlyMap<number, ReadonlySet<CellValue>>;
  errorIndices: ReadonlySet<number>;
  hintsRemaining: number;
  goldenRemaining: number;
  isNotesMode: boolean;
  isComplete: boolean;
}

interface SudokuGameActions {
  select(idx: number | null): void;
  place(value: CellValue): void;             // dispara onCellCorrect|Incorrect|BoxComplete
  toggleNote(value: CellValue): void;
  toggleNotesMode(): void;
  erase(): void;
  useHint(): void;                           // -1 hintsRemaining, llena notas correctas
  useGoldenCell(): void;                     // -1 goldenRemaining, place() la solución
  grantHints(n: number): void;               // modos lo usan al aplicar Reward
  grantGoldenCells(n: number): void;
}
```

### Cómo lo consumen los modos

| Modo | Suscribe | Hace |
|---|---|---|
| **Sudoloco** | `onCellCorrect`, `onCellIncorrect`, `onBoxComplete`, `onPuzzleComplete` | suma segundos, score; resta vidas; lanza microjuego; transiciona a siguiente nivel |
| **Cuento** | `onBoxComplete` | revela imagen `boxIndex` del cuento |
| **Historia** | `onBoxComplete`, `onPuzzleComplete` | revela imagen del capítulo; al completar marca capítulo |
| **Versus Islas** | `onCellCorrect` | throttle de `progress[uid]` a Firestore |
| **Versus Mar** | `onCellCorrect` | `runTransaction()` sobre `/liveMatches/{id}` para sumar score |

El motor **no sabe** de timers, monedas, redes ni microjuegos. Esos viven en cada modo.

---

## 16. Economía y customización

### Monedas

- Persistentes en perfil: `/users/{uid}/wallet.coins`.
- Se ganan **solo al final de una run de Sudoloco** (no como Reward de microjuego — los rewards siguen enfocados en supervivencia).
- Fórmula en `core/sudoku/economy.ts` (puro, testeable):

  ```ts
  computeRunReward(score: number, level: number): { coins: number }
  ```

  Propuesta inicial: `coins = floor(score / 100) + floor(level / 3)`. Iterar tras playtesting.

### Tienda

- Vive como pantalla dentro de **Biblioteca** (la tab `cuentos.tsx` se renombra a `biblio.tsx` cuando toque). Alternativa: feature dedicada `src/features/shop/`.
- Catálogo: packs de símbolos (Fase 7 de tienda) y, a futuro, skins de tablero (Fase posterior).
- Modelo Firestore:

  ```
  /users/{uid}
    wallet:    { coins }
    unlocked:  { symbolPackIds: string[], boardSkinIds: string[] }
    active:    { symbolPackId, boardSkinId }
  ```

- Compra = transacción Firestore: resta coins, agrega id a `unlocked.symbolPackIds`. Validación cliente, regla de seguridad valida que `coins >= price` (almacenar precio en código cliente firmado por hash o en doc `/catalog/{id}` solo-lectura).

### Packs de símbolos en scope

| Pack | Estado | Notas |
|---|---|---|
| `numbers` | ✅ implementado | gratis, default |
| `colors`  | ✅ implementado | gratis (o desbloqueo barato) |
| `figures` | pendiente | geométricas (círculo, triángulo, cuadrado, etc.) — render con SVG o `View` |
| `sprites` | pendiente | mugiwaras/jojos — assets de imagen, evaluar licencias |

Render desacoplado: el board guarda 1..9, `Cell` recibe `pack` y renderiza acorde a `pack.kind` (`text` / `color` / `image`).

### Skins de tablero (Fase futura — no ahora)

Cuando toque, vivirán en `core/board-skins/` con la misma arquitectura que packs:

```ts
interface BoardSkin {
  id: string;
  name: string;
  colors: { bg, thickLine, thinLine, cellSelected, cellPeer, cellError, ... };
  // futuro: frame asset, corner ornaments, background pattern
}
```

Por ahora, el skin activo = `theme/colors.ts` único. **No** introducir abstracción de skins hasta que haya al menos 2 skins reales que justifiquen el costo.

---

## 18. Reglas de rendimiento

Patrones obligatorios para evitar los problemas de performance que aparecen en apps RN con tableros grandes y timers frecuentes. Aplicar desde el inicio — son difíciles de retrofit.

### Separación estricta de stores

`RunState` (timer, vidas, score) y `BoardState` (tablero, celdas, notas) deben vivir en **stores de Zustand distintos**. Si comparten store, cada tick del timer (1/s) re-renderiza el tablero completo (81 celdas).

```
RunStore  →  <TimerDisplay />  re-renderiza cada segundo
GameStore →  <Board />         re-renderiza solo en moves
```

### Selectors finos por celda + `shallow`

Cada `<Cell>` se suscribe solo a los datos que le corresponden. Nunca leer el store entero dentro de un Cell.

```ts
// hooks.ts
export const useCellState = (idx: number) =>
  useSudokuStore(
    (s) => ({
      value:      s.board[idx],
      isFixed:    s.puzzle.fixed.has(idx),
      isSelected: s.selectedIndex === idx,
      isPeer:     s.selectedIndex != null && PEERS[s.selectedIndex].has(idx),
      isError:    s.errorIndices.has(idx),
    }),
    shallow,  // evita re-render si el objeto resultante no cambió
  );
```

Con esto, `select(idx)` solo re-renderiza ~20 celdas (la seleccionada + sus peers), no las 81.

### `React.memo` como barrera explícita

Aplicar en: `<Cell>`, `<NumberPad>`, `<LivesDisplay>`, `<TimerDisplay>`, `<ScoreDisplay>`. Sin `memo`, cualquier re-render del padre los arrastra aunque sus props no hayan cambiado.

### Acelerómetro → `useSharedValue` directo, nunca `setState`

Los datos del sensor llegan a ~60fps. Si pasan por `useState` o Zustand, generan 60 re-renders/segundo en el hilo JS. El dato debe ir del sensor directamente a Reanimated:

```ts
const tilt = useSharedValue(0);
// dentro del listener:
tilt.value = withTiming(accel.x * 0.35, { duration: 400 });
// el estilo animado lee tilt.value en el UI thread — React no se entera
```

### `<Board>` siempre montado durante microjuegos

Al lanzar un microjuego, **no desmontar** el tablero. Usar `opacity: 0` + `pointerEvents: 'none'` animados con Reanimated. Desmontar implica pérdida de estado + costo de remontaje.

### PEERS pre-computados fuera del render

La lista de celdas peer de cada índice se calcula una sola vez al arrancar el módulo, nunca dentro de un render ni de un selector:

```ts
// Calculado una vez en validator.ts al importar el módulo
export const PEERS: ReadonlySet<number>[] = precomputePeers();
```

Esto convierte el lookup de peers en O(1) en lugar de recalcularlo en cada render de celda.

### Tabla resumen

| Regla | Riesgo que previene |
|---|---|
| `RunState` / `BoardState` en stores separados | Timer contamina re-renders del tablero |
| `useCellState(idx)` + `shallow` | 81 re-renders por cada movimiento |
| `React.memo` en Cell y HUD | Re-renders en cascada desde el padre |
| Acelerómetro → `useSharedValue` | 60 re-renders/s en el hilo JS |
| Board siempre montado, ocultar con opacity | Costo de montaje en cada microjuego |
| PEERS pre-computados al importar | Recálculo O(81²) en cada render de celda |

---

## 17. Decisiones pendientes (cuando toquen)

- **Firestore Security Rules**: definir antes de Fase 4. Sin reglas, el plan gratuito está expuesto.
- **Imágenes de cuentos/historia**: ¿Firebase Storage o assets bundled? Storage permite actualizar sin redeploy; bundled funciona offline.
- **Onboarding** y selección inicial de pack de símbolos.
- **Analytics**: Firebase Analytics está incluido en Spark, falta decidir qué medir.
- **EAS Build**: configurar `eas.json` y perfiles `development` / `preview` / `production` antes de Fase 10.
- **Precio del IAP "sin anuncios"**: definir al implementar Fase 9 (referencia: $1.99–$2.99 USD).
- **crystal_heart**: mecánica pendiente de definir (¿escudo ante un error? ¿vida extra especial?). Existe en `rewards.ts` pero su efecto en `RunState` no está especificado.
