import React, { useMemo } from 'react';
import { TapTimingGame } from '../../kit/templates/TapTimingGame';
import type { Microgame, MicrogameProps } from '../../types';
import { buildConfig } from './config';

const HomeRun: React.FC<MicrogameProps> = ({ difficulty, onResult }) => {
  const config = useMemo(() => buildConfig(difficulty), [difficulty]);
  return <TapTimingGame config={config} onResult={onResult} />;
};

export const homeRun: Microgame = {
  id: 'home-run',
  nameKey: 'microgames.homeRun',
  category: 'tap-timing',
  minLevel: 1,
  durationMs: 4000,
  Component: HomeRun,
};
