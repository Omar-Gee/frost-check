export interface ScoreInputs {
  aiScore: number | null;
  aiConfidence: number | null;
  userAverage: number | null;
  userCount: number;
}

export interface CombinedScore {
  displayScore: number | null;
  aiScore: number | null;
  userAverage: number | null;
  userCount: number;
  label: string;
}

function userRatingToScore(rating: number): number {
  return ((rating - 1) / 4) * 100;
}

export function averageUserScore(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + userRatingToScore(r), 0);
  return sum / ratings.length;
}

/**
 * Combined display score:
 * - AI weight scales with confidence (0.3–0.7)
 * - User weight scales with count, capped at 5 ratings
 * - Falls back to whichever source is available
 */
export function computeDisplayScore(inputs: ScoreInputs): CombinedScore {
  const { aiScore, aiConfidence, userAverage, userCount } = inputs;

  let displayScore: number | null = null;

  const aiWeight =
    aiScore != null ? 0.3 + (aiConfidence ?? 0.5) * 0.4 : 0;
  const userWeight = userCount > 0 ? Math.min(userCount, 5) / 5 : 0;

  if (aiScore != null && userAverage != null && aiWeight + userWeight > 0) {
    displayScore =
      (aiScore * aiWeight + userAverage * userWeight) /
      (aiWeight + userWeight);
  } else if (aiScore != null) {
    displayScore = aiScore;
  } else if (userAverage != null) {
    displayScore = userAverage;
  }

  const rounded =
    displayScore != null ? Math.round(displayScore * 10) / 10 : null;

  return {
    displayScore: rounded,
    aiScore,
    userAverage,
    userCount,
    label: scoreLabel(rounded),
  };
}

function scoreLabel(score: number | null): string {
  if (score == null) return "Unknown";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Poor";
  return "No AC";
}

export function userRatingLabel(rating: number): string {
  const labels = ["", "Very poor", "Poor", "Fair", "Good", "Excellent"];
  return labels[rating] ?? "Unknown";
}
