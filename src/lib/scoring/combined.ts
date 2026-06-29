export interface ScoreInputs {
  aiScore: number | null;
  aiConfidence: number | null;
  userAverage: number | null;
  userCount: number;
}

export interface CombinedScore {
  displayScore: number | null;
  frostScore: number | null;
  aiScore: number | null;
  userAverage: number | null;
  userCount: number;
  label: string;
}

function aiScoreToFrost(aiScore100: number): number {
  return Math.round((1 + (aiScore100 / 100) * 4) * 10) / 10;
}

function frostToDisplay100(frostScore: number): number {
  return Math.round(((frostScore - 1) / 4) * 100);
}

export function averageUserScore(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/**
 * Combined Frost Score (1–5) per MVP plan:
 * - confidence >= 0.3: 60% AI + 40% user average
 * - else if >= 2 user ratings: user average
 * - else fall back to AI or user alone
 */
export function computeDisplayScore(inputs: ScoreInputs): CombinedScore {
  const { aiScore, aiConfidence, userAverage, userCount } = inputs;
  const aiFrost = aiScore != null ? aiScoreToFrost(aiScore) : null;
  const confidence = aiConfidence ?? 0;

  let frostScore: number | null = null;

  if (confidence >= 0.3 && aiFrost != null && userAverage != null) {
    frostScore = 0.6 * aiFrost + 0.4 * userAverage;
  } else if (userCount >= 2 && userAverage != null) {
    frostScore = userAverage;
  } else if (aiFrost != null) {
    frostScore = aiFrost;
  } else if (userAverage != null) {
    frostScore = userAverage;
  }

  const roundedFrost =
    frostScore != null ? Math.round(frostScore * 10) / 10 : null;

  return {
    frostScore: roundedFrost,
    displayScore:
      roundedFrost != null ? frostToDisplay100(roundedFrost) : null,
    aiScore,
    userAverage,
    userCount,
    label: scoreLabel(roundedFrost),
  };
}

function scoreLabel(frostScore: number | null): string {
  if (frostScore == null) return "No AC data yet — be the first!";
  if (frostScore >= 4.5) return "Excellent";
  if (frostScore >= 3.5) return "Good";
  if (frostScore >= 2.5) return "Fair";
  if (frostScore >= 1.5) return "Poor";
  return "No AC";
}

export function userRatingLabel(rating: number): string {
  const labels = ["", "Very poor", "Poor", "Fair", "Good", "Excellent"];
  return labels[rating] ?? "Unknown";
}
