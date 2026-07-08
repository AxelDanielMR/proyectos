# Microjuegos: instrucciones animadas, juego de pesca y galería en Biblioteca

**Fecha:** 2026-07-06 · **Estado:** aprobado por el usuario (conversación 2026-07-05/06)

## Objetivo

Tres entregables sobre la feature `microgames`:

1. **Sistema de instrucciones animadas** común a todos los microjuegos: un bucle corto arriba a la derecha que muestra cómo se resuelve el juego, compuesto por tres imágenes compartidas (mano pointer, mano haciendo clic, efecto de partículas).
2. **Tercer microjuego: Pesca** (categoría `tap-spam`), jugable con placeholders hasta que llegue el arte final.
3. **Galería de prueba en Biblioteca**: el botón "biblio" del home navega a `/biblioteca`, con una sección "Microjuegos" para probar cualquier juego registrado.

Además: `README.md` de la feature (guía de reglas y convenciones), script de reescalado de assets, y fix del `moduleNameMapper` de Jest para PNGs (los tests de hat-match ya fallan por esto).

## 1. Sistema de instrucciones

### Assets compartidos

`assets/microgames/instructions/` (ya colocados por el usuario, 84×92 px):
- `pointer.png` — mano apuntando (reposo)
- `clicking.png` — mano presionando
- `particules.png` — ráfaga de clic

La punta del dedo está hacia arriba-izquierda de la imagen: las partículas se renderizan con offset hacia la punta, no centradas en la mano.

### Modelo declarativo

Nuevo campo opcional en el descriptor `Microgame`:

```ts
// types.ts
export interface InstructionStep {
  hand: 'pointer' | 'clicking';
  particles?: boolean;              // muestra particules.png en la punta
  move?: { dx: number; dy: number }; // desplazamiento relativo (px de escenario) durante el paso
  durationMs: number;
}

export interface Microgame {
  // ...campos existentes
  instructions?: InstructionStep[];
}
```

### Componente `InstructionHint`

`kit/primitives/InstructionHint.tsx`:
- Overlay `position: absolute` arriba-derecha del stage, `pointerEvents="none"`, tamaño compacto (~72 px de alto), ligera transparencia para no tapar juego.
- Reproduce los pasos en secuencia con Reanimated (`withTiming` para `move`, swap de imagen por paso) y **repite en bucle** con una pausa corta (~400 ms) entre ciclos.
- Sin estado externo: recibe `steps: InstructionStep[]` y corre solo.

### Integración

`runner.tsx` monta `<InstructionHint steps={game.instructions} />` cuando el juego declara instrucciones. Los juegos existentes declaran su guion:

- **hat-match**: pointer (600 ms) → clicking+particles (350 ms) → clicking con `move {dy: +40}` (700 ms) — "arrastra hacia abajo".
- **home-run**: pointer (500 ms) → clicking con `move {dx: -25}` (400 ms) → clicking+particles con `move {dx: +50}` (300 ms) — "atrás y luego swing adelante".
- **fishing**: pointer (400 ms) → clicking+particles (250 ms) → pointer (200 ms) → clicking+particles (250 ms) → clicking+particles (250 ms) — "machaca".

Los guiones viven junto a cada juego (en su `index.tsx` o `config.ts`), no centralizados.

## 2. Microjuego Pesca

`games/fishing/` — categoría `tap-spam`, `minLevel: 1`, `durationMs: 6000`.

### Flujo (2 fases dentro del límite)

1. **Calma**: lago quieto. El pique llega tras `biteDelayMs` aleatorio (del PRNG de la run — determinista). Taps durante la calma no hacen nada.
2. **Pique + jalar**: animación de partículas de agua en el punto de la caña; desde ese momento cada tap suma progreso. El pez aparece pequeño y **crece con cada tap** (interpolación de escala + ciclo de frames del pez) hasta `tapsRequired` → `win`. Si se agota el tiempo → `lose` (lo maneja el runner).

### Lógica pura y testeable — `fishing.logic.ts`

```ts
export interface FishingConfig {
  biteDelayMs: number;   // 800..2200 según rng y dificultad (más tardío con dificultad)
  tapsRequired: number;  // ~8 (difficulty 0) .. ~18 (difficulty 1)
}
export function buildConfig(difficulty: number, rng: Rng): FishingConfig;
export function fishScale(taps: number, tapsRequired: number): number; // 0.3 → 1.0 monótono
export function fishFrame(taps: number, frameCount: number): number;   // cicla frames por tap
```

Tests Jest: rangos de config en difficulty 0/0.5/1, determinismo con mismo rng, monotonía de `fishScale`, ciclo de `fishFrame`.

### Presentación (placeholders hasta tener arte)

`assets.ts` del juego define los `Visual` con emoji: lago = fondo azul con 🎣, pique = 🌊 pulsante, pez = 🐟 (un solo "frame"). Cuando el usuario entregue `assets/microgames/fishing/*.png` (fondo lago+caña, secuencia de partículas de agua, secuencia de frames del pez), el swap es solo tocar `assets.ts`. Interacción táctil con `TapZone` a pantalla completa del stage.

### Registro

`register.ts` añade `registerMicrogame(fishing)`. i18n: `microgames.fishing` en `es`/`en`.

## 3. Galería en Biblioteca

- **`app/biblioteca.tsx`**: pantalla nueva (stack, como `app/sudoloco.tsx`). Secciones: por ahora solo "Microjuegos" (cuentos/customización llegarán según ARCHITECTURE §Biblioteca). Strings vía i18n (`biblioteca.*`).
- **`src/features/microgames/gallery/MicrogameGallery.tsx`**: lista de juegos registrados (`listMicrogames()`), cada fila con nombre traducido y categoría. Tocar un juego abre el modo prueba:
  - Selector de dificultad: chips Fácil (0.15) / Media (0.5) / Difícil (0.9).
  - Corre el **`MicrogameRunner` real** (mismas instrucciones y timer que en Sudoloco). El `rng` de prueba se crea con `createRng(String(Date.now()))` — el determinismo contractual aplica a core, no al sandbox.
  - Al terminar: overlay con resultado y botones "Jugar otra vez" / "Salir". Sin recompensas ni efectos sobre ninguna run.
- **`app/(tabs)/home.tsx`**: `handlePress('biblio')` → `router.push('/biblioteca')`. El tab placeholder `microgames.tsx` queda intacto.
- La galería vive dentro de la feature `microgames` para respetar "las features no se importan entre sí": la ruta compone, la feature provee.

## 4. Documentación y herramientas

- **`src/features/microgames/README.md`**: guía viva de la feature — contrato `Microgame`, categorías, cómo registrar un juego nuevo, cómo escribir guiones de instrucciones, convención de assets (carpeta por juego + `instructions/` compartida, imágenes ≤512 px por lado), mapeo de dificultad 0..1, y cómo probar en la galería. Referenciada desde CLAUDE.md.
- **`scripts/resize-assets.ps1`**: PowerShell + System.Drawing; recibe carpeta o archivos y los redimensiona a un máximo de 512 px por lado (proporción intacta), sobrescribiendo. Uso documentado en el README.
- **Fix Jest**: `moduleNameMapper` en la config de Jest que stubea `\.(png|jpg|jpeg|gif|webp)$` a un mock (`<rootDir>/jest/assetMock.js` → `module.exports = 1;`). Deja verde `hat-match.config.test.ts` (fallo preexistente) y permite testear configs que importan assets.

## Criterios de aceptación

1. `npm test` verde completo (incluido hat-match, hoy roto) con tests nuevos de `fishing.logic`.
2. `npm run typecheck` y lint limpios.
3. En Sudoloco, al completar una caja puede salir pesca; los 3 juegos muestran su animación de instrucciones arriba a la derecha en bucle.
4. Desde el home, botón biblio → Biblioteca → sección Microjuegos → cualquier juego se puede jugar N veces con la dificultad elegida, con resultado visible y sin afectar nada más.
5. Cero strings literales en JSX (todo vía `t()`); `core/` intacto.

## Fuera de alcance

Arte final de pesca (placeholder hasta recibir imágenes), más tipos de peces, persistencia de "descubiertos", secciones de cuentos/tienda en Biblioteca, recompensas en modo prueba.
