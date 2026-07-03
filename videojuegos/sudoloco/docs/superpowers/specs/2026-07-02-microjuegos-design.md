# Diseño — Sistema de Microjuegos (Sudoloco)

> Fecha: 2026-07-02
> Estado: aprobado (diseño). Siguiente paso: plan de implementación.
> Contexto: evoluciona ARCHITECTURE.md §8 (registry mínimo) hacia un sistema escalable a ~100 microjuegos sin degradar arranque ni fps.

## 1. Objetivo y restricciones

Construir el sistema de microjuegos estilo WarioWare que aparece al completar una caja en Sudoloco (y jugable desde el menú de Microjuegos). Requisitos del usuario:

- **Escalable a ~100 juegos** sin engordar el arranque ni trabar la app.
- **Cortos** (pocos segundos). **Timeout = derrota, siempre.**
- Aparecen en un **modal rectangular** (escenario centrado, proporción fija).
- Dificultad **adaptativa por juego** (no reglas fijas en el template).

Decisiones tomadas en brainstorming:

| Decisión | Elección |
|---|---|
| Filosofía de construcción | **Híbrido**: kit compartido (primitivas + templates) + escape hatch para juegos exóticos |
| Entrega de assets | **Todo bundled** en el APK (offline, sin latencia; se mitiga tamaño con sprite sheets + compresión) |
| Tecnología de animación | **Solo Reanimated 4 + Gesture Handler** (cero deps nuevas; animación por frames de sprites) |
| Curva de dificultad | **Abierta por juego** (el template no hornea reglas; balanceo diferido) |

## 2. Principio de escalabilidad

El registry es liviano y **nada pesado corre hasta montar un juego**:

- Un `require('./x.png')` bundled es solo un número (ref de asset); no decodifica.
- Un `Component` en el array es solo una función; no renderiza.
- Registrar 100 juegos = 100 refs de función + N refs de asset → arranque ~O(0).
- La imagen se decodifica **solo cuando el runner monta ese juego**, y **solo hay un juego montado a la vez**.

## 3. Arquitectura — 3 capas

```
src/features/microjuegos/
  registry.ts     metadatos livianos; agregar juego = 1 import + registerMicrogame()
  runner.tsx      overlay único: monta UN juego, inyecta contexto, veredicto, rollReward
  selection.ts    puro: elige juego (prefiere no-descubiertos, respeta minLevel);
                  mapea RunState.level → difficulty (0..1)
  kit/
    primitives/   piezas UI-thread reutilizables
    templates/    categorías config-driven (DragMatch, TapTiming, ...)
  games/
    pon-el-sombrero/   (template DragMatch + assets + resolver de dificultad propio)
    home-run/          (template TapTiming + assets + resolver propio)
    <exótico>/         (escape hatch: usa primitivas directo)
```

**Regla de oro del feature:** un microjuego "normal" es config sobre un template. Uno raro usa las primitivas directamente (escape hatch). Ninguno reimplementa timer, gestos ni veredicto: eso siempre viene del kit.

Las capas mapean a ARCHITECTURE.md:
- `core/` no participa (los microjuegos no son lógica de sudoku puro), salvo `core/sudoku/rewards.ts` que el runner consume.
- El feature **no importa** otras features (regla de oro #2). Habla con el motor de Sudoloco solo vía callbacks (`onBoxComplete`).

## 4. Categorías (templates)

Los ejemplos del usuario se reducen a 8 categorías reutilizables + 1 trivial. Se construyen incrementalmente; no todas de golpe.

| Categoría (`MicrogameCategory`) | Gesto base | Juegos de ejemplo |
|---|---|---|
| `drag-match` | arrastrar → soltar en objetivo | Pon el sombrero · Reciclaje (basura→bote) |
| `tap-timing` | tap en ventana justa | Home run · Caballero (golpear al acercarse, con delay) |
| `tap-targets` | tap sobre objetivos (fijos/móviles) | Mochila (correcto/incorrecto) · Matar moscas |
| `tap-spam` | tap repetido hasta meta | Romper pila de platos |
| `dodge` | mover jugador para esquivar | Pato en el río esquivando piedras |
| `reveal` | frotar con el dedo para descubrir | Quitar la mugre de la figura |
| `flick` | swipe con velocidad/dirección | Aventar la cubeta de agua |
| `sequence` | acciones en orden pedido | Girar para hacer la sopa |
| `inverse` | *no* interactuar | No hagas nada |

Un juego nuevo dentro de una categoría existente = solo config + assets + resolver de dificultad. Una categoría nueva = un template nuevo en `kit/templates/` apoyado en las primitivas.

### Templates abiertos (comportamiento adaptativo por juego)

El template **no hornea** reglas de dificultad ni contenido. Aporta mecánica y render genéricos; el juego aporta contenido + su adaptación:

```ts
// Cada juego exporta su propia curva. El template solo la invoca.
resolveDifficulty(difficulty: number): ConcreteConfig
```

Ejemplos ilustrativos (NO fijos; se balancean después con los juegos corriendo):
- DragMatch: el juego decide cuántos personajes/sombreros y qué "empareja" según `difficulty`.
- TapTargets: el juego decide cuántos objetos, cuáles son correctos/incorrectos, si se mueven.

El balanceo de números concretos es **trabajo posterior**, no parte de este diseño.

## 5. Primitivas del kit (`kit/primitives/`)

Corren en el UI thread (Reanimated / Gesture Handler). Alimentan todas las categorías:

```
useMicrogameTimer      countdown; timeout dispara 'lose' central
<Draggable> / <DropTarget> + useDragMatch    drag-match, flick
<TapZone>              hit areas → tap-timing, tap-targets, tap-spam
useSpawner + <MovingEntity> + hitTest        dodge, tap-targets móviles, tap-timing
useFlickGesture / useRotateGesture           flick, sequence
useSpriteFrames        animación por frames (batazo, caras)
<VerdictReaction>      win = felices · lose/timeout = enojados
<MicrogameStage>       modal rectangular; lienzo lógico fijo escalado al device
```

## 6. Escenario (modal rectangular)

`<MicrogameStage>` centrado, proporción fija, recorta contenido. **Cada juego se diseña contra un lienzo lógico fijo** (p. ej. 300×420); el stage lo escala al dispositivo → un juego se ve igual en cualquier pantalla sin recalcular layouts.

## 7. Interfaz

Evoluciona `Microgame` de ARCHITECTURE.md §8:

```ts
type MicrogameCategory =
  | 'drag-match' | 'tap-timing' | 'tap-targets' | 'tap-spam'
  | 'dodge' | 'reveal' | 'flick' | 'sequence' | 'inverse';

interface Microgame {
  id: string;
  nameKey: string;          // i18n, nunca literal en JSX
  category: MicrogameCategory;
  thumbnail: number;        // require() para el menú (locked = gris)
  minLevel: number;         // aparece a partir de este nivel de run
  durationMs: number;       // límite; timeout = lose
  Component: React.FC<MicrogameProps>;
}

interface MicrogameProps {
  difficulty: number;       // 0..1; el juego lo interpreta con su resolver
  rng: () => number;        // sembrado → contenido testeable/reproducible
  onResult: (r: 'win' | 'lose') => void;   // timeout lo maneja el runner
}
```

## 8. Rendimiento (reglas que evitan que trabe)

- **Un solo juego montado a la vez.** Board detrás con `opacity 0` + `pointerEvents:none`.
- **Animación en UI thread.** Posiciones (pelota, piedras, moscas, sombrero) en `useSharedValue`, no `useState`. El hilo JS no se entera → 60 fps. React solo re-renderiza en eventos discretos (win/lose).
- **Spawner en UI thread.** `useSpawner` mueve entidades y hace hit-test con `useFrameCallback`, sin re-renders por frame.
- **Warm-up antes de mostrar.** El runner precarga los assets del juego elegido con `Asset.loadAsync` durante un beat de "¿Listo?" y recién revela el stage → cero parpadeo por primera decodificación.
- **Assets optimizados.** Sprite sheets (una imagen, varios frames) + PNG comprimido → menor APK y menos draw calls.

## 9. Escalado de dificultad

`selection.ts` (puro) mapea `RunState.level → difficulty ∈ [0,1]`. El template recibe `difficulty` y llama al `resolveDifficulty` del juego. La curva concreta vive en cada juego (función pura, testeable). Números finales = balanceo diferido.

## 10. Integración con la run (Sudoloco)

```
onBoxComplete (callback del motor)
  → runner elige juego (selection.ts: prefiere no-descubiertos, respeta minLevel)
  → warm-up assets → monta juego en el stage
  → win  → rollReward(level, rng) de core/sudoku/rewards.ts → aplica al RunState
  → lose / timeout → { kind: 'none' }
  → primera aparición → persiste id en unlockedMicrogames (perfil)
```

**El runner es el único que toca `RunState`.** Los juegos son agnósticos del modo: funcionan igual desde el menú de Microjuegos (solo que sin recompensa). El menú lista todos los registrados; locked (gris) hasta descubrirlos.

## 11. Testing

- **Puro (Jest, sin RN):** `selection.ts` (elección + minLevel + preferir no-descubiertos), `resolveDifficulty` de cada juego, y los "resolvers" de victoria (¿este drop cuenta como win?, ¿este tap acertó la ventana?). Toda condición de victoria vive en una función pura, nunca en el render.
- **Componentes:** templates con react-native-testing-library disparando gestos simulados → verifican `onResult`.

## 12. Fuera de alcance (YAGNI por ahora)

- Assets remotos / descarga bajo demanda (se decidió: todo bundled).
- Lottie / Skia (se decidió: solo Reanimated + Gesture Handler).
- Números de dificultad balanceados (trabajo posterior con juegos corriendo).
- Implementar las 9 categorías de golpe (se construyen incrementalmente).
- Definir la mecánica de `crystal_heart` (decisión pendiente, ARCHITECTURE.md §17).
