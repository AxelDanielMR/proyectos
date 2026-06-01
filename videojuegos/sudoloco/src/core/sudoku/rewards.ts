import type { Rng } from './prng';

export type Reward =
  | { kind: 'time'; amount: number }
  | { kind: 'hint' }
  | { kind: 'silver_cell' }
  | { kind: 'golden_cell' }
  | { kind: 'life' }
  | { kind: 'crystal_heart' }
  | { kind: 'none' };

interface RewardWeights {
  time: number;
  hint: number;
  silver_cell: number;
  golden_cell: number;
  life: number;
  crystal_heart: number;
  none: number;
}

// Tabla de probabilidades (en %)
const WEIGHTS_BY_LEVEL = {
  early: {
    time: 26,
    hint: 18,
    silver_cell: 12,
    golden_cell: 4,
    life: 5,
    crystal_heart: 10,
    none: 25,
  } as RewardWeights,
  late: {
    time: 22,
    hint: 20,
    silver_cell: 14,
    golden_cell: 8,
    life: 8,
    crystal_heart: 8,
    none: 20,
  } as RewardWeights,
};

function interpolateWeights(level: number): RewardWeights {
  // Nivel 1-10: early, Nivel 20+: late, interpolar en el medio
  if (level <= 10) return WEIGHTS_BY_LEVEL.early;
  if (level >= 20) return WEIGHTS_BY_LEVEL.late;

  const t = (level - 10) / 10;
  const early = WEIGHTS_BY_LEVEL.early;
  const late = WEIGHTS_BY_LEVEL.late;

  return {
    time: early.time + (late.time - early.time) * t,
    hint: early.hint + (late.hint - early.hint) * t,
    silver_cell: early.silver_cell + (late.silver_cell - early.silver_cell) * t,
    golden_cell: early.golden_cell + (late.golden_cell - early.golden_cell) * t,
    life: early.life + (late.life - early.life) * t,
    crystal_heart: early.crystal_heart + (late.crystal_heart - early.crystal_heart) * t,
    none: early.none + (late.none - early.none) * t,
  };
}

export function rollReward(level: number, rng: Rng): Reward {
  const weights = interpolateWeights(level);
  const roll = rng() * 100; // 0..100

  let cumulative = 0;

  if ((cumulative += weights.time) >= roll) {
    // time amount: 10-20 segundos escalado por nivel (mínimo 10)
    const amount = 10 + Math.min(20, Math.floor(level / 2));
    return { kind: 'time', amount };
  }

  if ((cumulative += weights.hint) >= roll) {
    return { kind: 'hint' };
  }

  if ((cumulative += weights.silver_cell) >= roll) {
    return { kind: 'silver_cell' };
  }

  if ((cumulative += weights.golden_cell) >= roll) {
    return { kind: 'golden_cell' };
  }

  if ((cumulative += weights.life) >= roll) {
    return { kind: 'life' };
  }

  if ((cumulative += weights.crystal_heart) >= roll) {
    return { kind: 'crystal_heart' };
  }

  return { kind: 'none' };
}
