import { findAssessment } from "@/lib/assessment-bank";
import { calculateMasteryProof } from "@/lib/mastery-proof";

type Activity = { activityType: string; activityId: string; correctCount: number; totalCount: number; detailsJson: string; completedAt: string };
type AssessmentAttempt = { assessmentId: string; answersJson: string; completedAt: string };
type Progress = { lessonSlug: string; status: string; updatedAt: string };
type Review = { lessonSlug: string; lastRating: string; repetitions: number };
type Mistake = { lessonSlug: string; status: string };
type Confidence = "low" | "medium" | "high";
type Observation = { key: string; correct: boolean; completedAt: string; activityType: string; confidence?: Confidence };

type ActivityDetails = {
  confidence?: Confidence | Record<string, Confidence>;
  results?: Array<{ questionId?: string; correct?: boolean }>;
};

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function activityObservations(activities: Activity[]) {
  return activities.flatMap((activity) => {
    const details = parseJson<ActivityDetails>(activity.detailsJson, {});
    return (details.results ?? []).filter((result): result is { questionId: string; correct: boolean } => typeof result.questionId === "string" && typeof result.correct === "boolean").map((result) => {
      const confidence = typeof details.confidence === "string" ? details.confidence : details.confidence?.[result.questionId];
      return { key: result.questionId, correct: result.correct, completedAt: activity.completedAt, activityType: activity.activityType, confidence } satisfies Observation;
    });
  });
}

function assessmentObservations(attempts: AssessmentAttempt[]) {
  return attempts.flatMap((attempt) => {
    const assessment = findAssessment(attempt.assessmentId);
    if (!assessment) return [];
    const answers = parseJson<Record<string, number>>(attempt.answersJson, {});
    return assessment.questions.map((question) => ({ key: question.id, correct: Number(answers[question.id]) === question.correctOption, completedAt: attempt.completedAt, activityType: "assessment" } satisfies Observation));
  });
}

function retentionWindow(observations: Observation[], days: number) {
  const byQuestion = new Map<string, Observation[]>();
  for (const item of observations) byQuestion.set(item.key, [...(byQuestion.get(item.key) ?? []), item]);
  const delayed = Array.from(byQuestion.values()).flatMap((items) => {
    const ordered = [...items].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    const latest = ordered.at(-1);
    if (!latest) return [];
    const latestTime = new Date(latest.completedAt).getTime();
    const prior = ordered.find((item) => latestTime - new Date(item.completedAt).getTime() >= days * 86_400_000);
    return prior ? [latest] : [];
  });
  const correct = delayed.filter((item) => item.correct).length;
  return { days, label: `${days}-day retention`, eligible: delayed.length, correct, rate: delayed.length ? Math.round(correct / delayed.length * 100) : null };
}

function confidenceOutcome(observations: Observation[]) {
  const judgements = observations.filter((item): item is Observation & { confidence: Confidence } => item.confidence === "low" || item.confidence === "medium" || item.confidence === "high");
  const calibrated = judgements.filter((item) => item.confidence === "medium" || item.confidence === "high" && item.correct || item.confidence === "low" && !item.correct).length;
  return {
    judgements: judgements.length,
    calibrated,
    rate: judgements.length ? Math.round(calibrated / judgements.length * 100) : null,
    highConfidenceWrong: judgements.filter((item) => item.confidence === "high" && !item.correct).length,
    lowConfidenceCorrect: judgements.filter((item) => item.confidence === "low" && item.correct).length,
    method: "Agreement counts high-confidence correct, low-confidence incorrect, and medium-confidence responses as neutral calibration signals.",
  };
}

function unfamiliarCaseOutcome(activities: Activity[]) {
  const applicationTypes = new Set(["clinical_case", "clinical_encounter", "visual_lab", "diagnostic_justification", "counterfactual_transfer"]);
  const firstByActivity = new Map<string, Activity>();
  for (const activity of [...activities].sort((a, b) => a.completedAt.localeCompare(b.completedAt))) {
    if (!applicationTypes.has(activity.activityType)) continue;
    const key = `${activity.activityType}:${activity.activityId}`;
    if (!firstByActivity.has(key)) firstByActivity.set(key, activity);
  }
  const firstAttempts = Array.from(firstByActivity.values());
  const answered = firstAttempts.reduce((sum, item) => sum + item.totalCount, 0);
  const correct = firstAttempts.reduce((sum, item) => sum + item.correctCount, 0);
  return { activities: firstAttempts.length, answered, correct, rate: answered ? Math.round(correct / answered * 100) : null, method: "Only the first saved attempt for each case, encounter, visual challenge, diagnostic justification, or counterfactual transfer drill is counted." };
}

export function calculateLearningOutcomes(input: {
  progress: Progress[];
  activities: Activity[];
  assessments: AssessmentAttempt[];
  reviews: Review[];
  mistakes: Mistake[];
}) {
  const observations = [...activityObservations(input.activities), ...assessmentObservations(input.assessments)].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const proof = calculateMasteryProof({ progress: input.progress, activities: input.activities, reviews: input.reviews, mistakes: input.mistakes });
  const prerequisites = proof.topics.map((topic) => ({
    slug: topic.slug,
    title: topic.title,
    href: topic.href,
    state: topic.state,
    passedCount: topic.passedCount,
    openMistakes: topic.openMistakes,
    missing: topic.gates.filter((gate) => !gate.passed).map((gate) => gate.label),
  })).sort((a, b) => a.passedCount - b.passedCount || b.openMistakes - a.openMistakes);
  const totalObservations = observations.length;
  const maturity = totalObservations >= 60 ? "stable personal signal" : totalObservations >= 20 ? "developing personal signal" : "early personal signal";
  return {
    generatedAt: new Date().toISOString(),
    retention: [7, 30, 90].map((days) => retentionWindow(observations, days)),
    unfamiliarCases: unfamiliarCaseOutcome(input.activities),
    confidence: confidenceOutcome(observations),
    prerequisites,
    dataMaturity: {
      state: maturity,
      totalObservations,
      firstEvidenceAt: observations[0]?.completedAt ?? null,
      lastEvidenceAt: observations.at(-1)?.completedAt ?? null,
      detail: totalObservations < 20 ? "Keep collecting repeated retrieval and first-attempt application evidence before treating trends as stable." : totalObservations < 60 ? "Useful personal patterns are emerging, but every percentage still needs its sample size." : "The personal sample is broader, but it is still not cohort validation or proof of clinical competence.",
    },
    boundary: "These are private personal learning signals, not cohort statistics, exam prediction, or certification of clinical competence.",
  };
}
