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
  stats: { wins, losses, totalGames }, createdAt, updatedAt

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

## 7. Microjuegos (plugin registry)

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

---

## 8. Estado y caché

| Tipo de estado | Solución |
|---|---|
| UI local de un componente | `useState` |
| Estado de una feature (tablero en juego, modo) | Zustand (una store por feature) |
| Datos remotos (perfil, partidas, capítulos) | React Query |
| Partida en curso (sobrevive cierre) | MMKV |
| Tokens, secrets | SecureStore |
| Idioma seleccionado | MMKV |

---

## 9. Variables de entorno

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

## 10. Comandos comunes

```bash
npm start                 # Metro
npm run android           # Build + lanzar en device/emulador
npm run ios               # iOS (macOS solamente)
npm run typecheck         # tsc --noEmit
npm run lint              # ESLint
npm run lint:fix          # ESLint --fix
npm run format            # Prettier write
```

---

## 11. Estado actual (Fase 0 ✅)

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

---

## 12. Siguientes pasos

### Fase 1 — Núcleo Sudoku (sin UI)
1. `core/sudoku/solver.ts` — backtracking con heurísticas básicas.
2. `core/sudoku/validator.ts` — chequeo fila/columna/caja, conflictos.
3. `core/sudoku/generator.ts` — genera tablero por dificultad y semilla; verifica unicidad.
4. `core/sudoku/difficulty.ts` — heurísticas para clasificar (cuántas pistas, qué técnicas).
5. **Tests Jest** — meta 100% en `core/sudoku`.

### Fase 2 — UI base
6. `ui/Board/`, `ui/Cell/`, `ui/NumberPad/`, `ui/ProgressBar/` — componentes reutilizables por todos los modos.
7. Renderizado dinámico según `SymbolPack` activo.
8. Animaciones Reanimated en selección y feedback de error.

### Fase 3 — Modo Sudoloco (sin microjuegos aún)
9. `features/sudoloco/store.ts` (Zustand) — tablero, selección, notas, undo.
10. `features/sudoloco/screen.tsx` — pantalla de partida completa.
11. Persistencia en MMKV (partida en curso).

### Fase 4 — Auth + perfil
12. Pantallas de registro/login con Firebase Auth (email + password).
13. `services/firebase/users.repo.ts` — CRUD de perfil.
14. Perfil: pack de símbolos preferido, dificultad por defecto.

### Fase 5 — Microjuegos
15. Implementar 3-5 microjuegos iniciales (tap-fast, memory-flash, simon, etc.).
16. `runner.tsx` — overlay que aparece al completar caja, arranca microjuego, devuelve control.
17. Persistencia de `unlockedMicrogames` en perfil.

### Fase 6 — Cuento
18. Modelo `StoryChapter` en Firestore + seed con un cuento de prueba.
19. Pantalla de partida con overlay de imagen tras cada caja.
20. Vista de carrusel al completar.

### Fase 7 — Historia
21. Lógica de capítulos, progresión, menú de capítulos.

### Fase 8 — Versus Islas
22. Sistema de códigos de partida (Firestore docs con TTL).
23. Sistema de amigos (subcolección `/users/{uid}/friends`).
24. Throttled progress sync.

### Fase 9 — Versus Mar
25. Reglas de seguridad RTDB (validación de movimientos).
26. Transacciones de movimiento + scoring.
27. Indicadores de presencia.

### Fase 10 — Pulido
28. Animaciones de celebración, sonidos, haptics.
29. Onboarding.
30. Builds EAS para producción (Android primero, iOS después).

---

## 13. Decisiones pendientes (cuando toquen)

- **Firestore Security Rules**: definir antes de Fase 4. Sin reglas, el plan gratuito está expuesto.
- **Imágenes de cuentos/historia**: ¿Firebase Storage o assets bundled? Storage permite actualizar sin redeploy; bundled funciona offline.
- **Onboarding** y selección inicial de pack de símbolos.
- **Analytics**: Firebase Analytics está incluido en Spark, falta decidir qué medir.
- **EAS Build**: configurar `eas.json` y perfiles `development` / `preview` / `production` antes de Fase 10.
