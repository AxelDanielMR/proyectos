# Diseño — Guardado automático y reanudación de partida (Sudoloco)

> Fecha: 2026-07-02 · Modo afectado: **Sudoloco** (roguelike) · Estado: aprobado, pendiente de plan de implementación.

## Objetivo

Permitir que una partida de Sudoloco se guarde **automáticamente** y se pueda **reanudar exactamente donde se quedó**, aunque el usuario cierre la app. Como paso final, el **highscore** y las **monedas** ganadas se persisten en Firebase al terminar la run.

Alcance explícito de tres tareas:

1. **Save/autosave + reanudación** con fidelidad exacta (celda por celda).
2. **Coherencia de puntaje y monedas**: la lógica de cálculo **ya existe y se mantiene sin cambios**. El trabajo aquí es garantizar que score y monedas se mantengan coherentes a través de un ciclo guardar→reanudar (sin perderse ni contarse doble).
3. **Persistencia en Firebase** de highscore + monedas al finalizar la run (ya parcialmente cableado; se endurece y se conecta con el ciclo de vida del save).

## Decisiones de diseño (confirmadas con el usuario)

- **Fidelidad del save**: exacta, celda por celda (tablero, notas, errores, timer, vidas, score, powerups).
- **App en segundo plano**: auto-pausa y **congela** el timer; al volver retoma en pausa. No hay timer de reloj de pared.
- **UX de reanudación**: al entrar a Sudoloco con un save válido, se pregunta **Continuar / Nueva partida**.
- **Fórmulas de score y monedas**: sin cambios (`onCellCorrect`, `onPuzzleComplete`, `computeRunReward`).
- **Almacenamiento del save**: local en **MMKV**. Firebase solo para highscore + monedas al terminar.

## Enfoque de persistencia elegido

**Serializar solo el estado mutable y regenerar el puzzle.** El generador es determinista (`generate(difficulty, seed:level)`), así que el `puzzle` (`initial` + `solution`) no se guarda: se regenera desde `seed + level`. Solo se persiste la meta de la run y lo que el jugador modificó. Save pequeño (~1 KB) y sin duplicar una fuente de verdad determinista.

Alternativas descartadas:

- **Serializar el puzzle completo** (initial + solution): save ~3× más grande, duplica datos deterministas.
- **Middleware `persist` de Zustand**: el store tiene campos no serializables (`rng`, `puzzle`) y son dos stores separados; el middleware complica más de lo que ayuda.

## Arquitectura

El estado de una partida vive en **dos stores** y ambos deben persistirse:

1. `useSudolocoStore` (`src/features/sudoloco/store.ts`) — meta de la run: `level`, `lives`, `crystalHearts`, `timeRemaining`, `score`, `hints`, `silverCells`, `goldenCells`, `seed`, `phase`.
2. Store de `SudokuGame` (`src/ui/SudokuGame/store.ts`, factory por partida) — progreso del puzzle: `board`, `notesByCell`, `errorIndices`, `hintsRemaining`, `silverRemaining`, `goldenRemaining`.

### 1. Modelo de datos del save (`SavedRun`)

Un único blob en MMKV bajo `StorageKeys.inProgressGame`, validado con Zod, con `version` para migraciones:

```ts
SavedRun {
  version: 1
  savedAt: number            // timestamp inyectado como parámetro (nunca Date.now dentro de lógica pura)
  // meta de la run (useSudolocoStore)
  seed: string
  level: number
  lives: number
  crystalHearts: number
  timeRemaining: number
  score: number
  hints: number              // contadores otorgados (run store)
  silverCells: number
  goldenCells: number
  // progreso del puzzle actual (SudokuGame store)
  board: CellValue[]         // 81 valores puestos por el jugador
  notes: [number, number[]][] // Map<cellIdx, value[]> serializado
  errorIndices: number[]
  hintsRemaining: number     // powerups sin usar (game store)
  silverRemaining: number
  goldenRemaining: number
}
```

No se guardan `phase` (al reanudar siempre entra a `playing`), ni `rng`/`puzzle` (se regeneran desde el seed).

### 2. Módulo de save (`src/features/sudoloco/save.ts`)

Separa lógica pura (testeable con Jest) de IO:

- **Puro**:
  - `SavedRunSchema` (Zod) y tipo `SavedRun`.
  - `serializeRun(runState, gameState, now: number): SavedRun`.
  - `deserializeRun(saved: SavedRun): { runState, gameState }` — regenera el puzzle desde `seed + level` y reconstruye el estado de ambos stores.
- **IO fino** (usa el servicio MMKV `storage` de `@services/storage`):
  - `persistSave(saved: SavedRun): void`.
  - `loadSave(): SavedRun | null` — lee y valida con Zod; si el parse falla (corrupto o versión desconocida), descarta el save y devuelve `null`.
  - `clearSave(): void`.

Respeta las reglas de arquitectura: la feature es dueña de su forma de save y usa el primitivo de storage del servicio; no importa otras features.

### 3. Autosave (hook `useAutoSave` en la feature)

- Se **suscribe a ambos stores** (run + game). Ante cambios relevantes hace snapshot y persiste, **throttled** (máx. una escritura cada ~2 s) para no escribir en cada tick del timer.
- Listener de **`AppState`**: al pasar a `background`/`inactive` → `pauseRun()` (congela el timer) + **save forzado inmediato** (captura el `timeRemaining` exacto). Esto cubre el cierre de la app.
- Solo persiste si `phase` es jugable (`playing`, `paused`, `microgame`, `between_levels`). En `idle`/`gameover` no guarda.

### 4. Reanudación (entrada a Sudoloco)

`SudolocoScreen` deja de llamar `startRun()` a ciegas al montar. En su lugar:

- **Hay save válido** (`loadSave()` ≠ null) → pantalla *"Partida en curso — Nivel X · Score Y"* con:
  - **Continuar** → rehidrata ambos stores vía `deserializeRun` → `phase: 'playing'`.
  - **Nueva partida** → `clearSave()` + `startRun()`.
- **No hay save** → `startRun()` directo.

Al rehidratar, los powerups **restantes** se restauran en el game store (`initialHints/Silver/Golden = *Remaining` del save) y en el run store con valores consistentes, de modo que el efecto de sync existente en la pantalla (`diff = granted - remaining`) dé `diff = 0` y no vuelva a otorgar powerups (sin doble conteo).

### 5. Ciclo de vida del save + Firebase (tarea 3)

- Al entrar a **`gameover`** (`_finishRun` ya calcula `coinsEarned` con `computeRunReward`, sin cambios):
  - `updateHighscoreIfBetter(uid, score)` + `addCoins(uid, coinsEarned)` (ya cableado en `screen.tsx`, con guard `savedRef` y `catch` con log).
  - **`clearSave()`** — la run terminó y no se reanuda. Evita ofrecer reanudar una partida muerta y evita recontar monedas.
- Firebase: `updateHighscoreIfBetter` usa transacción (coherente entre runs); el SDK ya encola escrituras offline. Se mantiene el manejo de error con log.

### 6. Coherencia de score y monedas a través del save

- El save persiste el `score` completo y lo restaura → el puntaje continúa sin perderse al reanudar.
- Las monedas se calculan **una sola vez** al `gameover` (`computeRunReward(score, level)`), y el save se borra en ese mismo momento → imposible recontar.
- Sin cambios a las fórmulas de score ni de monedas.

## Flujo de datos (resumen)

```
Jugando ──(cambios en run/game store)──▶ useAutoSave (throttled) ──▶ MMKV
        └─(AppState background)──▶ pauseRun() + save forzado ──▶ MMKV

Entrar a Sudoloco ──▶ loadSave()
   ├─ save válido ──▶ [Continuar] deserializeRun ──▶ rehidrata stores ──▶ playing
   │                  [Nueva]      clearSave + startRun
   └─ sin save ─────▶ startRun

gameover ──▶ updateHighscoreIfBetter + addCoins (Firebase) ──▶ clearSave()
```

## Manejo de errores

- **Save corrupto / versión desconocida**: `loadSave()` valida con Zod; ante fallo descarta el save y devuelve `null` (se trata como "sin partida guardada"). No se bloquea la entrada al modo.
- **Escritura MMKV**: síncrona y local; si lanzara, se captura y se registra sin interrumpir el juego.
- **Firebase offline / error**: el SDK encola offline; los errores se registran con log. El highscore es transaccional.

## Testing

`src/features/sudoloco/__tests__/save.test.ts` (Jest, estilo core, sin RN):

- Round-trip: `serializeRun → deserializeRun` preserva meta de run y progreso del puzzle (board, notas, errores, powerups restantes).
- Regeneración determinista: el puzzle reconstruido en `deserializeRun` reproduce el mismo `puzzle.initial`/`solution` para `seed + level`.
- Zod rechaza saves corruptos y con `version` desconocida (→ `loadSave` devuelve `null`).
- Coherencia de powerups: restauración deja `granted === remaining` para que el sync de la pantalla no re-otorgue.

## Fuera de alcance

- Sincronización del save en curso a la nube (multi-dispositivo). El save es local; solo highscore + monedas van a Firebase.
- Cambios a las fórmulas de score o de monedas.
- Timer de reloj de pared en segundo plano (se descartó a favor de congelar).
- Guardado de partidas de otros modos (Versus, Cuento, Historia).
```
