# Diseño: Auth anónimo, Ads/IAP, Recompensas y Reorden de fases

**Fecha:** 2026-05-30  
**Estado:** Aprobado por el usuario

---

## 1. Cambio en recompensas de microjuegos

### Problema
`rewards.ts` incluye `{ kind: 'score'; amount: number }` como posible recompensa al ganar un microjuego. Esta recompensa no es coherente con la filosofía del sistema: las recompensas de microjuego deben ser de supervivencia o utilidad en la run, no puntos que el usuario ya gana naturalmente al colocar celdas.

### Solución
Eliminar la variante `score` del tipo `Reward` y de la función `rollReward`. La probabilidad que tenía (~25 % nivel 1 → ~20 % nivel 20) se redistribuye entre `time` y `hint`.

```ts
// ANTES
type Reward =
  | { kind: 'score'; amount: number }
  | { kind: 'time'; amount: number }
  | { kind: 'hint' }
  | { kind: 'silver_cell' }
  | { kind: 'golden_cell' }
  | { kind: 'life' }
  | { kind: 'crystal_heart' }
  | { kind: 'none' };

// DESPUÉS
type Reward =
  | { kind: 'time'; amount: number }
  | { kind: 'hint' }
  | { kind: 'silver_cell' }
  | { kind: 'golden_cell' }
  | { kind: 'life' }
  | { kind: 'crystal_heart' }
  | { kind: 'none' };
```

**Archivos afectados:** `src/core/sudoku/rewards.ts` y sus tests en `__tests__/rewards.test.ts`.

---

## 2. Auth anónimo → registro opcional

### Problema actual
`AuthGuard` en `app/_layout.tsx` redirige a `/login` si no hay sesión autenticada. Esto crea fricción inmediata para usuarios nuevos que solo quieren jugar.

### Solución: Firebase Anonymous Auth + upgrade opcional

#### Flujo completo

```
Primera apertura
  → signInAnonymously() silencioso (Firebase Auth)
  → Crear /users/{uid} en Firestore con datos vacíos
  → Entrar directo al home sin ninguna pantalla intermedia

Durante el juego — nudges contextuales (no bloqueantes):
  → Pantalla game over: banner "¿Quieres conservar tu highscore? Regístrate"
  → Tab Perfil: muestra estado "Jugando como invitado" + botón "Crear cuenta"

Al registrarse (voluntario):
  → linkWithCredential(EmailAuthProvider.credential(email, password))
  → El UID anónimo se convierte en UID permanente — Firestore sin migración
  → displayName, email e isAnonymous: false se actualizan en el documento
```

#### Estados de AuthStatus
```ts
type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unauthenticated';
// 'unauthenticated' solo ocurre durante el proceso de signInAnonymously o tras signOut explícito
```

#### Restauración de cuenta tras reinstalar
- Si el usuario no se registró antes de desinstalar: UID anónimo perdido, datos perdidos. Comportamiento esperado y comunicado en la UI ("regístrate para no perder tu progreso").
- Si el usuario se registró: al reinstalar entra con email/password y recupera todos sus datos de Firestore.

#### Archivos afectados
| Archivo | Cambio |
|---|---|
| `app/_layout.tsx` | `AuthGuard` llama a `signInAnonymously` en lugar de redirigir a login |
| `src/features/auth/store.ts` | Añadir estado `'anonymous'`; acción `linkAccount(email, password)` |
| `src/features/auth/queries.ts` | `useCreateUser` se llama automáticamente tras `signInAnonymously` |
| `app/(auth)/login.tsx` | Accesible solo desde perfil/nudge, no como gate |
| `app/(auth)/register.tsx` | Usa `linkWithCredential` si hay sesión anónima activa; crea cuenta nueva si no |

---

## 3. Anuncios (AdMob) + compra "sin anuncios" (RevenueCat)

### Decisión de implementación
- **Ads:** `react-native-google-mobile-ads` — intersticiales AdMob
- **IAP:** `react-native-purchases` (RevenueCat) — pago único, gestiona recibos y restore purchases

### Regla de frecuencia

```ts
// src/features/ads/adGate.ts  — lógica pura, sin dependencias de RN
function shouldShowAd(
  trigger: 'puzzle_complete' | 'game_over',
  puzzlesSinceLastAd: number,
): boolean {
  if (trigger === 'game_over') return true;
  if (trigger === 'puzzle_complete') return puzzlesSinceLastAd >= 3;
  return false;
}
```

- **Game over:** siempre muestra anuncio (momento natural de pausa)
- **Puzzle completado:** solo si han pasado ≥ 3 puzzles desde el último anuncio
- **Usuarios con "sin anuncios":** `shouldShowAd` nunca se ejecuta

### Entitlement "sin anuncios"
- RevenueCat gestiona el recibo del pago único y el restore purchases
- `useHasRemovedAds()` hook consulta RevenueCat en lugar de Firestore — funciona aunque el usuario reinstale y restaure compra, sin necesidad de almacenar nada en Firestore

### Estructura de archivos
```
src/features/ads/
  adGate.ts       # shouldShowAd — lógica pura testeable
  useAds.ts       # hook: preload + show intersticial
  useIAP.ts       # hook: comprar "sin anuncios" + restaurar compra
```

### Integración con RunStore (Sudoloco)
El store de Sudoloco mantiene `puzzlesSinceLastAd: number`:
- Incrementa en `onPuzzleComplete`
- Se resetea a 0 al mostrar un anuncio
- No persiste en MMKV (se reinicia con cada run)

### Análisis de rentabilidad (referencia)
| DAU | Impresiones/día | Ingreso/mes (CPM $1 LATAM) |
|---|---|---|
| 1,000 | ~2,500 (cap 3 puzzles) | ~$75 |
| 10,000 | ~25,000 | ~$750 |

Costo Firestore con modelo mínimo: < $1/mes hasta 10,000 DAU.

---

## 4. Modelo de datos Firestore (mínimo)

### Esquema `/users/{uid}`

```
/users/{uid}
  displayName:    string | null      ← null si anónimo
  email:          string | null      ← null si anónimo
  isAnonymous:    boolean
  createdAt:      Timestamp

  stats:
    highscore:    number
    bestLevel:    number

  wallet:
    coins:        number

  unlocked:
    symbolPackIds:  string[]         ← vacío por defecto
    microgameIds:   string[]         ← se añade al descubrir por primera vez

  active:
    symbolPackId:  string            ← 'numbers' por defecto
```

### Lo que NO va a Firestore
| Dato | Dónde vive | Por qué |
|---|---|---|
| Run activa (timer, vidas, board) | MMKV | Volátil, no necesita sync |
| `hasRemovedAds` | RevenueCat | IAP lo gestiona |
| Progreso Historia/Cuento | `completedChapterIds[]` en Firestore (cuando existan) | Solo IDs completados |
| Stats detalladas (errores, etc.) | Decidir al implementar analytics | Fuera de scope actual |

### Writes por sesión típica
- Al terminar run: 1 write (highscore + coins si cambiaron)
- Al desbloquear microjuego: 1 write
- Al comprar pack: 1 write

Estimado: 1–3 writes/sesión. Gratis en Spark hasta ~4,000 DAU, centavos más allá.

---

## 5. Reorden de fases del proyecto

### Nuevo orden

| Fase | Contenido | Notas |
|---|---|---|
| **3** | Motor compartido `SudokuGame` + Modo Sudoloco completo | Ya en progreso |
| **4** | Auth anónimo + registro opcional | Reemplaza el login obligatorio |
| **5** | Microjuegos + Biblioteca básica | Simultáneas — Biblioteca necesaria para testear microjuegos en Sudoloco |
| **6** | Versus Islas + Versus Mar | Multijugador |
| **7** | Historia | Capítulos secuenciales |
| **8** | Cuento | Sudoku narrativo con imágenes |
| **9** | Ads (AdMob) + IAP "sin anuncios" (RevenueCat) | Cuando el juego esté maduro y jugable |
| **10** | UI pulido, animaciones, onboarding, EAS Build | Producción |

### Por qué Microjuegos + Biblioteca van juntas (Fase 5)
Los microjuegos de Sudoloco necesitan la pantalla de Biblioteca para:
- Ver qué microjuegos se han desbloqueado
- Seleccionar el pack de símbolos activo
- Ambas cosas requieren leer `unlocked` de Firestore, que ya existe desde Fase 4

La Biblioteca básica no incluye tienda ni packs de pago — solo la galería de desbloqueados y el selector de pack activo. La tienda completa va en Fase 9 o posterior.

### Por qué Versus antes de Historia/Cuento
Versus es más complejo técnicamente (RTDB, transacciones, presencia) pero independiente del contenido editorial (imágenes de cuentos). Historia y Cuento dependen de assets y contenido que pueden prepararse en paralelo mientras se desarrolla Versus.

---

## 6. Dependencias nuevas a instalar (cuando toque cada fase)

| Fase | Librería | Comando |
|---|---|---|
| 9 | AdMob | `npx expo install react-native-google-mobile-ads` |
| 9 | RevenueCat | `npx expo install react-native-purchases` |

Ambas requieren config nativa (`app.json` plugins) y cuentas en AdMob / RevenueCat / Google Play Console. No instalar antes de Fase 9.
