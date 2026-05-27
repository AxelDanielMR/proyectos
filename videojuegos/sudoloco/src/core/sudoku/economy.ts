// Coins earned at the end of a Sudoloco run.
// Formula: floor(score / 100) + floor(level / 3). Tune after playtesting.
export function computeRunReward(
  score: number,
  level: number,
): { coins: number } {
  const coins = Math.floor(score / 100) + Math.floor(level / 3);
  return { coins };
}
