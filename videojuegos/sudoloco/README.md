# Sudoloco

App móvil de Sudoku (Expo + React Native) con varios modos: un roguelike de vidas y timer acumulado (Sudoloco), dos modos multijugador, cuentos que se revelan al resolver, e historias por capítulos. Microjuegos estilo WarioWare aparecen al completar una caja.

Para el diseño del proyecto (arquitectura, motor de sudoku compartido, modelo de datos, roadmap), ver [ARCHITECTURE.md](ARCHITECTURE.md). Para cómo trabajar en este repo con Claude Code, ver [CLAUDE.md](CLAUDE.md).

## Requisitos

- Node.js 20+
- Android Studio (emulador o dispositivo Android) — es donde se prueba la app; iOS no es prioridad ahora mismo
- Un proyecto de Firebase (plan **Spark**, gratis) con Auth, Firestore y Realtime Database habilitados

## Setup

1. Clonar el repo e instalar dependencias:

   ```bash
   npm install
   ```

2. Crear un proyecto en [Firebase Console](https://console.firebase.google.com/):
   - Habilitar **Authentication** → método Anónimo (y Email/Password si vas a probar registro)
   - Crear una base de **Firestore** (modo producción; las reglas de seguridad son una decisión pendiente, ver ARCHITECTURE.md §17)
   - Crear una instancia de **Realtime Database** (necesaria para Versus Mar; puedes omitirla si no vas a tocar ese modo)
   - En "Configuración del proyecto" → "Tus apps" → agregar una app Web para obtener las keys

3. Copiar `.env.example` a `.env` y completar con las keys de Firebase:

   ```bash
   cp .env.example .env
   ```

   `EXPO_PUBLIC_FIREBASE_DATABASE_URL` es la URL de tu Realtime Database (algo como `https://<proyecto>-default-rtdb.firebaseio.com`). Es opcional para arrancar, pero si tu instancia no está en la región por defecto y la dejas vacía, el cliente Firebase inferirá una URL que puede ser la incorrecta — revisa la consola por el warning si vas a usar Versus Mar.

   **El `.env` nunca se commitea** (ya está en `.gitignore`). Si alguna vez terminó en un commit, esas credenciales cuentan como comprometidas — regenéralas en Firebase Console.

## Correr la app

```bash
npm start              # Metro bundler
npm run android        # build + lanzar en Android Studio (emulador o dispositivo)
```

## Comandos comunes

```bash
npm run typecheck      # tsc --noEmit
npm run lint            # ESLint
npm run lint:fix        # ESLint con --fix
npm run format          # Prettier
npm test                # Jest (core/unit sin RN + components con jest-expo)
npm run test:coverage   # Jest con cobertura (gate en src/core/, ver jest.config.js)
```

## Troubleshooting

- **`npm install` falla con `ERESOLVE` por `react-dom`**: `expo-router` trae `react-dom` como peer opcional (soporte web, vía Radix UI) sin pinearlo, así que npm intenta resolver la versión más nueva — que puede no coincidir con el `react` exacto que usa el proyecto. Ya está fijado con `overrides.react-dom` en `package.json`; si vuelve a pasar tras actualizar React, ajusta ese override a la misma versión.
- **`npm install` avisa de conflictos de peer dependencies de ESLint** (eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-import piden `eslint@&lt;9`, el proyecto usa `eslint@10`): son solo warnings, no bloquean la instalación. El lint en sí ya funciona (ver `eslint.config.mjs`) — `eslint-plugin-import` en particular no soporta `eslint@10` del todo (por eso no hay regla `import/order` activa).
- **Pantalla en blanco al abrir la app**: revisa la consola de Metro — `app/_layout.tsx` loguea si fallan las fuentes (`fontError`) en vez de colgarse en blanco, así que un error real debería verse ahí.
- **RTDB apunta al host equivocado**: ver la nota de `EXPO_PUBLIC_FIREBASE_DATABASE_URL` arriba.
