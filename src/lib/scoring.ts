export type BonusType = "double_multiplier" | "shield_full_odds";

export type ScoreInput = {
  odds: number;
  rank: number | null;
  hasDoubleMultiplier: boolean;
  hasShield: boolean;
};

export type ScoreOutput = {
  basePoints: number;
  multiplier: number;
  finalPoints: number;
  reason: "outside_top5" | "top1" | "top5_shield" | "top5_divided";
};

export function computeScore(input: ScoreInput): ScoreOutput {
  const { odds, rank, hasDoubleMultiplier, hasShield } = input;
  let basePoints = 0;
  let reason: ScoreOutput["reason"] = "outside_top5";

  if (rank !== null && rank <= 5) {
    if (rank === 1) {
      basePoints = odds;
      reason = "top1";
    } else if (hasShield) {
      basePoints = odds;
      reason = "top5_shield";
    } else {
      basePoints = odds / rank;
      reason = "top5_divided";
    }
  }

  const multiplier = hasDoubleMultiplier ? 2 : 1;

  return {
    basePoints,
    multiplier,
    finalPoints: basePoints * multiplier,
    reason,
  };
}
