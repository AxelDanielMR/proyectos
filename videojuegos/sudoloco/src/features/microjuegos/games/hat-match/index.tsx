import React, { useMemo } from 'react';
import { DragMatchGame } from '../../kit/templates/DragMatchGame';
import type { Microgame, MicrogameProps } from '../../types';
import { buildConfig } from './config';

const PonElSombrero: React.FC<MicrogameProps> = ({ difficulty, rng, onResult }) => {
  const config = useMemo(() => buildConfig(difficulty, rng), []);
  return <DragMatchGame config={config} onResult={onResult} />;
};

export const ponElSombrero: Microgame = {
  id: 'pon-el-sombrero',
  nameKey: 'microgames.ponElSombrero',
  category: 'drag-match',
  minLevel: 1,
  durationMs: 6000,
  Component: PonElSombrero,
};
