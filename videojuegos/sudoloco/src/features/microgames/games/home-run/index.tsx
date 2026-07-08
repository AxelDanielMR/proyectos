import React, { useMemo } from 'react';
import { TapTimingGame } from '../../kit/templates/TapTimingGame';
import type { Microgame, MicrogameProps } from '../../types';
import { buildConfig } from './config';

const HomeRun: React.FC<MicrogameProps> = ({ difficulty, rng, onResult, onReveal }) => {
  // Config fija por partida: consumir el rng una sola vez.
  const config = useMemo(() => buildConfig(difficulty, rng), []);
  return <TapTimingGame config={config} onResult={onResult} onReveal={onReveal} />;
};

export const homeRun: Microgame = {
  id: 'home-run',
  nameKey: 'microgames.homeRun',
  category: 'tap-timing',
  minLevel: 1,
  durationMs: 4000,
  Component: HomeRun,
  instructions: [
    { hand: 'pointer', durationMs: 500 },
    { hand: 'clicking', move: { dx: -22, dy: 0 }, durationMs: 400 },
    { hand: 'clicking', particles: true, move: { dx: 45, dy: 0 }, durationMs: 300 },
  ],
};
