# src/core/

Lógica pura del proyecto. Regla de oro nº1 (ver [ARCHITECTURE.md](../../ARCHITECTURE.md)): **nada aquí importa React, React Native, Expo ni Firebase.** Testeable con Jest sin emuladores — de hecho corre en el proyecto `core` de `jest.config.js`, que usa `testEnvironment: 'node'` puro.

Consecuencias concretas de esa regla, no siempre obvias:

- **Determinismo es contractual, no una preferencia.** `core/sudoku/` no llama `Math.random()` ni `Date.now()` en ningún punto — toda la aleatoriedad entra por un `Rng` inyectado (`prng.ts`, mulberry32 sobre un hash FNV-1a de la seed). Esto es necesario porque Versus Islas genera el mismo tablero en dos dispositivos a partir de la misma seed, y las partidas guardadas se reconstruyen regenerando el puzzle en vez de serializar el tablero completo.
- **Sin imágenes ni assets de Metro.** `require('*.png')` es una API de Metro — un módulo que la use deja de ser testeable con `ts-jest` puro (Jest no tiene el asset-mocking del proyecto `core`) y dejó de ser "core" en la práctica. Por eso `numbersPack` (que sí usa imágenes) vive en `src/ui/symbols/`, no aquí — `core/symbols/` solo tiene `colorsPack`, que es dato puro.
- **Las funciones no mutan sus argumentos**, salvo que el nombre lo diga explícitamente (`solveMutating`, `fillSolutionMutating` son privadas; los wrappers públicos como `solve()`/`generate()` copian antes de tocar nada).

## Módulos

- `sudoku/` — generador, solver, validador, dificultad, progreso, pistas, recompensas, economía. Ver el JSDoc de cada función pública; los tests en `__tests__/` documentan casos límite mejor que cualquier prosa.
- `symbols/` — tipos y packs de símbolos sin dependencias de imagen (`colorsPack`). Los packs con imágenes viven en `src/ui/symbols/`.

## Cobertura

`npm run test:coverage` aplica un `coverageThreshold` sobre `src/core/**` (ver `jest.config.js`). Si baja de forma real, el build falla — no lo subas artificialmente excluyendo archivos sin una razón como las de arriba.
