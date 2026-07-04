import React, { useMemo } from 'react';
import { DragMatchGame } from '../../kit/templates/DragMatchGame';
import type { Microgame, MicrogameProps } from '../../types';
import { buildConfig } from './config';

const HatMatch: React.FC<MicrogameProps> = ({ difficulty, rng, onResult }) => {
  const config = useMemo(() => buildConfig(difficulty, rng), []);
  return <DragMatchGame config={config} onResult={onResult} />;
};

export const hatMatch: Microgame = {
  id: 'hat-match',
  nameKey: 'microgames.hatMatch',
  category: 'drag-match',
  minLevel: 1,
  durationMs: 6000,
  Component: HatMatch,
};
