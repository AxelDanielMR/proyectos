# Diseño — Animación de objeto ganado en microjuegos (tareas 1+2+3)

Fecha: 2026-07-03
Modo afectado: Sudoloco (roguelike). Los microjuegos solo otorgan recompensa en este modo.

## Objetivo

Unificar tres peticiones que en realidad describen un mismo flujo de remate de victoria:

1. El microjuego debe terminar cuando sale la animación de victoria/derrota, no al agotarse el timeout.
2. La recompensa (incluido el tiempo) se otorga al **terminar** la animación, no al iniciar el microjuego.
3. Al ganar, el **objeto de la recompensa** sube desde abajo de la pantalla hasta el centro ganando opacidad hasta el 100%, da un brinquito (sube y baja) y luego cae rápido hasta desaparecer.

Además: **ganar el microjuego siempre otorga una recompensa** — se elimina el resultado `none` del sorteo.

### Estado previo (por qué las tareas 1 y 2 "ya funcionaban")

El código actual ya termina el microjuego al primer resultado (no espera el timeout) y ya otorga la recompensa en `onFinish` (al terminar), no al iniciar. Ver `runner.tsx:23-28` y `screen.tsx:290-296`. Este diseño no corrige un bug de esas dos tareas: las **reinterpreta** como parte del nuevo remate de victoria (el objeto que sube ES la animación de victoria, y el premio se otorga cuando esa animación acaba).

## Enfoque (B — overlay en la pantalla)

La animación del objeto vive en `SudolocoScreen` como un overlay independiente del runner. El `MicrogameRunner` solo reporta win/lose.

Flujo:

```
GANAR:  microjuego resuelto → onFinish('win') → overlay RewardReveal (sube, brinquito, cae)
        → al terminar la animación: grantReward + exitMicrogame
PERDER: microjuego resuelto → VerdictReaction (cara triste actual) → onFinish('lose')
        → exitMicrogame (sin premio)
```

Decisión de UX: en **victoria** el runner ya **no** muestra la cara feliz `VerdictReaction`; el remate de victoria pasa a ser el objeto que sube. En **derrota** se conserva la cara triste actual sin cambios. Esto evita dos animaciones seguidas al ganar.

### Secuencia detallada

1. `phase === 'microgame'` → `MicrogameRunner` corre igual que hoy.
2. Runner:
   - Derrota → renderiza `VerdictReaction` (cara triste) → su `onDone` llama `onFinish('lose')`.
   - Victoria → llama `onFinish('win')` de inmediato, sin montar `VerdictReaction`.
3. `SudolocoScreen.onFinish(result)`:
   - `'lose'` → `exitMicrogame()`.
   - `'win'` → `setRevealReward(microgameReward)`; **no** sale del microjuego todavía.
4. La pantalla monta `<RewardReveal>` mientras `revealReward != null` (y oculta el runner). Al terminar la animación (`onDone`):
   `grantReward(revealReward)` → `exitMicrogame()` → `setRevealReward(null)`.

Esto satisface: tarea 1 (el microjuego termina cuando la animación acaba), tarea 2 (el premio se otorga al final de la animación), tarea 3 (la animación del objeto).

## Componentes y archivos

### Nuevos

- **`src/features/sudoloco/ui/RewardReveal.tsx`** — componente presentacional (Reanimated). Props: `{ emoji?: string; source?: ImageSourcePropType; onDone: () => void }`. Renderiza `<Image source>` si hay `source`, si no un `<Text>` con `emoji`. Corre la animación de 3 fases y llama `onDone` al final. Sin lógica de recompensa (tonto y testeable por inspección/visual).
- **`src/features/sudoloco/rewardVisual.ts`** — función pura `rewardVisual(reward: Reward): { emoji?: string; source?: ImageSourcePropType }`. Mapea cada `kind` a su icono. Importa `actionIcons` de `@ui/icons` y `Reward` de `@core/sudoku`.

### Modificados

- **`src/core/sudoku/rewards.ts`** — eliminar `none`:
  - Quitar `| { kind: 'none' }` del tipo `Reward` y `none` de `RewardWeights` y de ambas tablas.
  - Redistribuir el peso de `none` de forma proporcional (renormalización): cada peso restante × `100 / (100 − none)`. Preserva rarezas relativas y suma 100.
  - `rollReward` deja de tener rama `none`; la última recompensa (`crystal_heart`) es el fallback.
- **`src/features/sudoloco/store.ts`** — quitar `case 'none'` de `grantReward` (el `switch` deja de necesitarlo).
- **`src/features/microjuegos/runner.tsx`** — montar `VerdictReaction` solo cuando `result === 'lose'`. En victoria, llamar `onFinish('win')` directamente (por ejemplo vía efecto al detectar `result === 'win'`).
- **`src/features/sudoloco/screen.tsx`** — estado `revealReward: Reward | null`; ajustar el `onFinish` del runner; renderizar el overlay `RewardReveal` cuando `revealReward != null` y ocultar el runner en ese caso.

## Mapeo recompensa → icono

| Recompensa      | Fuente                                                                         |
| --------------- | ------------------------------------------------------------------------------ |
| `time_boost`    | emoji `⏱️` (placeholder temporal; se sustituye por imagen que dará el usuario) |
| `hint`          | `actionIcons.hint` (`hind.png`)                                                |
| `silver_cell`   | `actionIcons.silverCell` (`silver_cell.png`)                                   |
| `golden_cell`   | `actionIcons.goldenCell` (`golden_cell.png`)                                   |
| `life`          | `actionIcons.heart` (`heart.png`)                                              |
| `crystal_heart` | `actionIcons.frozenHeart` (`frozen_heart.png`)                                 |

Cuando llegue la imagen de `time_boost` (y los gifs de la tarea 6), solo se cambia el retorno de `rewardVisual` — cero refactor en `RewardReveal`.

## Animación `RewardReveal`

Reanimated, mismo patrón que `VerdictReaction`. Objeto centrado (`absoluteFill`, `pointerEvents="none"`), tamaño ~96px. Fondo tenue `rgba(0,0,0,0.35)` que aparece/desaparece con el objeto. Tres fases encadenadas sobre `translateY` + `opacity`:

| Fase                  | Qué pasa                                                                         | Duración |
| --------------------- | -------------------------------------------------------------------------------- | -------- |
| A. Subir + aparecer   | `translateY` de +240 (abajo) → 0 (centro); `opacity` 0→1                         | ~450 ms  |
| B. Brinquito          | `translateY` −24 y regreso al centro con `withSpring`; opcional `scale` 1→1.08→1 | ~350 ms  |
| C. Caer + desaparecer | `translateY` 0 → +240 rápido; `opacity` 1→0; al terminar dispara `onDone`        | ~220 ms  |

Total ~1 s. Duraciones y offsets como constantes nombradas. `onDone` se dispara desde la última animación (fase C) vía `runOnJS`.

## Testing

- **Core (TDD, Jest) — `rewards.ts`:**
  - `rollReward` nunca devuelve `none` en todo el rango del PRNG (barrido de rolls y niveles).
  - Los pesos suman 100 en `early`, `late` y niveles interpolados.
  - Se preservan las proporciones relativas tras la renormalización (p. ej. `hint` sigue siendo la más común, `golden_cell` de las más raras según el nivel).
  - Actualizar los tests existentes de `rewards` que referencien `none`.
- **Puro (TDD) — `rewardVisual.ts`:** para cada `kind` del union `Reward`, `rewardVisual` devuelve un objeto con `emoji` **o** `source` no vacío (test exhaustivo; si se agrega un `kind` nuevo, el test obliga a mapearlo).
- **`RewardReveal`:** validación visual corriendo la app en el emulador (Reanimated puro, igual que `VerdictReaction`, que tampoco tiene test unitario).

## Fuera de alcance

- Animación nueva de derrota (se conserva la actual).
- Imagen de `time_boost` y gifs de la tarea 6 (se integran después cambiando solo `rewardVisual`).
- Firebase / persistencia (auth anónimo) — sesión futura.
- Nuevo microjuego — sesión futura.
