import type { Rng } from './prng';

export type Reward =
  | { kind: 'time_boost' }
  | { kind: 'hint' }
  | { kind: 'silver_cell' }
  | { kind: 'golden_cell' }
  | { kind: 'life' }
  | { kind: 'crystal_heart' };

interface RewardWeights {
  time_boost: number;
  hint: number;
  silver_cell: number;
  golden_cell: number;
  life: number;
  crystal_heart: number;
}

// Tabla de pesos relativos. No es obligatorio que sumen 100: rollReward rueda
// contra el total real, así que quitar `none` conserva las proporciones exactas
// entre las recompensas restantes (renormalización implícita).
const WEIGHTS_BY_LEVEL = {
  early: {
    time_boost: 8,
    hint: 24,
    silver_cell: 12,
    golden_cell: 6,
    life: 13,
    crystal_heart: 10,
  } as RewardWeights,
  late: {
    time_boost: 10,
    hint: 20,
    silver_cell: 14,
    golden_cell: 16,
    life: 14,
    crystal_heart: 8,
  } as RewardWeights,
};

function interpolateWeights(level: number): RewardWeights {
  if (level <= 10) return WEIGHTS_BY_LEVEL.early;
  if (level >= 20) return WEIGHTS_BY_LEVEL.late;

  const t = (level - 10) / 10;
  const early = WEIGHTS_BY_LEVEL.early;
  const late = WEIGHTS_BY_LEVEL.late;

  return {
    time_boost: early.time_boost + (late.time_boost - early.time_boost) * t,
    hint: early.hint + (late.hint - early.hint) * t,
    silver_cell: early.silver_cell + (late.silver_cell - early.silver_cell) * t,
    golden_cell: early.golden_cell + (late.golden_cell - early.golden_cell) * t,
    life: early.life + (late.life - early.life) * t,
    crystal_heart:
      early.crystal_heart + (late.crystal_heart - early.crystal_heart) * t,
  };
}

export function rollReward(level: number, rng: Rng): Reward {
  const weights = interpolateWeights(level);
  const total =
    weights.time_boost +
    weights.hint +
    weights.silver_cell +
    weights.golden_cell +
    weights.life +
    weights.crystal_heart;
  const roll = rng() * total;

  let cumulative = 0;

  if ((cumulative += weights.time_boost) >= roll) return { kind: 'time_boost' };
  if ((cumulative += weights.hint) >= roll) return { kind: 'hint' };
  if ((cumulative += weights.silver_cell) >= roll)
    return { kind: 'silver_cell' };
  if ((cumulative += weights.golden_cell) >= roll)
    return { kind: 'golden_cell' };
  if ((cumulative += weights.life) >= roll) return { kind: 'life' };
  return { kind: 'crystal_heart' };
}
