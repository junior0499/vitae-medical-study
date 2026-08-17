export type RecallRating = "again" | "hard" | "good";
export type RecallDifficulty = "easy" | "medium" | "hard";
export type RecallConfidence = "low" | "medium" | "high";

type ExistingReview = { repetitions: number; intervalDays: number; easeScore: number; dueAt: string } | null;
type ExistingSignal = { lapseCount: number; reviewCount: number; accuracyStreak: number; averageResponseMs: number } | null;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateAdaptiveReview(input: {
  existing: ExistingReview;
  signal: ExistingSignal;
  rating: RecallRating;
  difficulty: RecallDifficulty;
  confidence: RecallConfidence;
  responseMs?: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const correct = input.rating !== "again";
  const priorInterval = Math.max(1, input.existing?.intervalDays ?? 1);
  const priorEase = input.existing?.easeScore ?? 250;
  const priorLapses = input.signal?.lapseCount ?? 0;
  const priorReviews = input.signal?.reviewCount ?? 0;
  const lapseCount = priorLapses + (correct ? 0 : 1);
  const reviewCount = priorReviews + 1;
  const accuracyStreak = correct ? (input.signal?.accuracyStreak ?? 0) + 1 : 0;
  const responseMs = clamp(Math.round(Number(input.responseMs) || 0), 0, 20 * 60 * 1000);
  const averageResponseMs = responseMs
    ? Math.round((((input.signal?.averageResponseMs ?? 0) * priorReviews) + responseMs) / reviewCount)
    : input.signal?.averageResponseMs ?? 0;
  const dueTime = input.existing ? new Date(input.existing.dueAt).getTime() : now.getTime();
  const overdueDays = Math.max(0, Math.floor((now.getTime() - dueTime) / 86_400_000));
  const lapseRate = lapseCount / reviewCount;
  const confidentError = !correct && input.confidence === "high";
  const forgettingScore = clamp(Math.round(
    lapseRate * 60 + (correct ? 0 : 25) + (confidentError ? 15 : 0)
      + (overdueDays > Math.max(2, priorInterval) ? 10 : 0) - accuracyStreak * 4,
  ), 0, 100);

  const ratingEase = input.rating === "again" ? -20 : input.rating === "hard" ? -12 : 5;
  const difficultyEase = input.difficulty === "hard" ? -8 : input.difficulty === "easy" ? 5 : 0;
  const confidenceEase = confidentError ? -8 : correct && input.confidence === "high" ? 3 : 0;
  const easeScore = clamp(priorEase + ratingEase + difficultyEase + confidenceEase, 130, 300);
  const repetitions = correct ? (input.existing?.repetitions ?? 0) + 1 : 0;
  let intervalDays = 0;
  let dueAt: Date;

  if (!correct) {
    dueAt = new Date(now.getTime() + 10 * 60 * 1000);
  } else {
    const difficultyFactor = input.difficulty === "hard" ? 0.78 : input.difficulty === "easy" ? 1.18 : 1;
    const confidenceFactor = input.confidence === "low" ? 0.88 : input.confidence === "high" ? 1.08 : 1;
    const historyFactor = clamp(1 - lapseRate * 0.45, 0.55, 1);
    const overdueBonus = 1 + Math.min(0.25, overdueDays / Math.max(8, priorInterval * 4));
    if (input.rating === "hard") intervalDays = Math.max(1, Math.round(priorInterval * 1.15 * difficultyFactor * historyFactor));
    else if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = Math.max(2, Math.round(3 * difficultyFactor * confidenceFactor));
    else intervalDays = Math.max(2, Math.round(priorInterval * (easeScore / 100) * difficultyFactor * confidenceFactor * historyFactor * overdueBonus));
    dueAt = new Date(now.getTime() + intervalDays * 86_400_000);
  }

  const rationale = [
    input.rating === "again" ? "The answer was missed, so it returns in 10 minutes." : `${input.rating === "hard" ? "A difficult retrieval keeps the interval close." : "A successful retrieval lengthens the interval."}`,
    input.difficulty === "hard" ? "High difficulty shortened the next interval." : input.difficulty === "easy" ? "Low difficulty safely lengthened the next interval." : "Medium difficulty kept the base interval.",
    confidentError ? "High confidence with an incorrect answer increased forgetting risk." : input.confidence === "low" && correct ? "Low confidence kept the successful answer closer." : "Confidence matched the review result.",
    lapseCount ? `${lapseCount} ${lapseCount === 1 ? "lapse" : "lapses"} across ${reviewCount} ${reviewCount === 1 ? "review" : "reviews"} reduced expansion.` : "No forgetting lapse has been recorded.",
  ];

  return { correct, repetitions, intervalDays, easeScore, dueAt: dueAt.toISOString(), lapseCount, reviewCount, accuracyStreak, averageResponseMs, forgettingScore, nextIntervalDays: intervalDays, overdueDays, rationale };
}
