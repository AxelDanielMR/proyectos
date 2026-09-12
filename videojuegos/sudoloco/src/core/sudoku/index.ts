export type {
  Board,
  Cell,
  CellValue,
  Difficulty,
  MoveResult,
  Puzzle,
} from './types';

export type { Rng } from './prng';
export { createRng, shuffled } from './prng';

export {
  cellInfo,
  getPeers,
  BOX_CELLS,
  isValid,
  validateMove,
  matchesSolution,
} from './validator';
export { solve, countSolutions, hasUniqueSolution } from './solver';
export { getClueRange, getClueCount } from './difficulty';
export { generate } from './generator';
export { computeProgress, detectBoxCompletion } from './progress';
export { levelConfig, INITIAL_TIME_S, buildPuzzleSeed } from './progression';
export type { LevelConfig } from './progression';
export { rollReward } from './rewards';
export type { Reward } from './rewards';
export { revealCandidate, pickHintCell, revealRandomCell } from './hints';
export { computeRunReward } from './economy';
