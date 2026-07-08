# Microjuegos — guía de la feature

Sistema de microjuegos estilo WarioWare. En Sudoloco salen al completar una caja;
en la Biblioteca (`/biblioteca`, botón library del home) se pueden probar todos en sandbox.

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
- `InstructionHint`: bucle de instrucciones (lo monta el runner).
- Templates: `DragMatchGame`, `TapTimingGame` (+ su `.logic.ts`).
