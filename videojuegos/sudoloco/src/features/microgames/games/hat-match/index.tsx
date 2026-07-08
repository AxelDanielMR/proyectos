import React, { useMemo } from 'react';
import { DragMatchGame } from '../../kit/templates/DragMatchGame';
import type { Microgame, MicrogameProps } from '../../types';
import { buildConfig } from './config';

const HatMatch: React.FC<MicrogameProps> = ({ difficulty, rng, onResult, onReveal }) => {
  const config = useMemo(() => buildConfig(difficulty, rng), []);
  return <DragMatchGame config={config} onResult={onResult} onReveal={onReveal} />;
};

export const hatMatch: Microgame = {
  id: 'hat-match',
  nameKey: 'microgames.hatMatch',
  category: 'drag-match',
  minLevel: 1,
  durationMs: 6000,
  Component: HatMatch,
  // El propio juego anima la victoria/derrota (personajes bamboleándose) antes de
  // reportar el resultado; el runner no debe superponer el VerdictReaction genérico.
  hasOwnReveal: true,
  instructions: [
    { hand: 'pointer', durationMs: 600 },
    { hand: 'clicking', particles: true, durationMs: 350 },
    { hand: 'clicking', move: { dx: 0, dy: 40 }, durationMs: 700 },
  ],
};
