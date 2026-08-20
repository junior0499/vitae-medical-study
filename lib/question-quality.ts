import { cardiovascularAssessment } from "@/lib/assessment-bank";
import { interleavedSession } from "@/lib/advanced-learning";
import { cardiovascularProgressTest } from "@/lib/cardiovascular-pathway";
import { clinicalEncounter } from "@/lib/clinical-encounter";
import { clinicalCases, diagnosticAssessment, visualChallenges } from "@/lib/learning-engine";

export type QualityQuestion = {
  id: string;
  sourceKind: string;
  prompt: string;
  options: string[];
  correctOption: number;
  sourceLabel: string;
};

function withSource(sourceKind: string, questions: Array<Omit<QualityQuestion, "sourceKind">>): QualityQuestion[] {
  return questions.map((question) => ({ ...question, sourceKind }));
}

export const qualityQuestionCatalog: QualityQuestion[] = [
  ...withSource("Starting diagnostic", diagnosticAssessment.questions),
  ...withSource("Timed assessment", cardiovascularAssessment.questions),
  ...withSource("Progressive case", clinicalCases.flatMap((item) => item.steps)),
  ...withSource("Visual laboratory", visualChallenges),
  ...withSource("Interleaved review", interleavedSession.questions),
  ...withSource("Cumulative test", cardiovascularProgressTest.questions),
  ...withSource("Clinical encounter", clinicalEncounter.steps),
];

type Observation = { questionId: string; selected: number; correct: boolean; attemptScore: number };

function parseJson(value: string) {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

export function buildQuestionQuality(input: {
  activities: Array<{ correctCount: number; totalCount: number; detailsJson: string }>;
  assessments: Array<{ assessmentId: string; correctCount: number; totalCount: number; answersJson: string }>;
  reviews: Array<{ questionKey: string; decision: string; flagsJson: string; reviewerNote: string; updatedAt: string }>;
  generated: Array<{ id: string; prompt: string; optionsJson: string; answer: string; status: string; sourceQuote: string }>;
}) {
  const catalog = [...qualityQuestionCatalog];
  for (const question of input.generated) {
    let options: string[] = [];
    try { options = JSON.parse(question.optionsJson) as string[]; } catch { /* A written question has no options. */ }
    if (options.length < 2) continue;
    catalog.push({ id: question.id, sourceKind: "Approved-source draft", prompt: question.prompt, options, correctOption: Math.max(0, options.indexOf(question.answer)), sourceLabel: question.sourceQuote ? "Exact uploaded-source passage" : "Source passage missing" });
  }

  const catalogMap = new Map(catalog.map((question) => [question.id, question]));
  const observations: Observation[] = [];
  for (const attempt of input.activities) {
    const details = parseJson(attempt.detailsJson);
    const results = Array.isArray(details.results) ? details.results as Array<{ questionId?: string; selected?: number; correct?: boolean }> : [];
    const attemptScore = attempt.totalCount ? attempt.correctCount / attempt.totalCount : 0;
    for (const result of results) if (result.questionId && catalogMap.has(result.questionId)) observations.push({ questionId: result.questionId, selected: Number(result.selected ?? -1), correct: Boolean(result.correct), attemptScore });
  }
  const assessment = cardiovascularAssessment;
  for (const attempt of input.assessments) {
    if (attempt.assessmentId !== assessment.id) continue;
    const answers = parseJson(attempt.answersJson);
    const attemptScore = attempt.totalCount ? attempt.correctCount / attempt.totalCount : 0;
    for (const question of assessment.questions) {
      const selected = Number(answers[question.id] ?? -1);
      observations.push({ questionId: question.id, selected, correct: selected === question.correctOption, attemptScore });
    }
  }

  const reviewMap = new Map(input.reviews.map((review) => [review.questionKey, review]));
  const items = catalog.map((question) => {
    const seen = observations.filter((item) => item.questionId === question.id);
    const correct = seen.filter((item) => item.correct).length;
    const correctRate = seen.length ? Math.round(correct / seen.length * 100) : null;
    const optionCounts = question.options.map((option, index) => ({ option, count: seen.filter((item) => item.selected === index).length, correct: index === question.correctOption }));
    const high = seen.filter((item) => item.attemptScore >= .7);
    const low = seen.filter((item) => item.attemptScore < .7);
    const discrimination = high.length >= 4 && low.length >= 4
      ? Math.round(((high.filter((item) => item.correct).length / high.length) - (low.filter((item) => item.correct).length / low.length)) * 100)
      : null;
    const automaticFlags: string[] = [];
    if (seen.length < 8) automaticFlags.push("Not enough attempts for a stable signal");
    if (seen.length >= 8 && (correctRate ?? 0) >= 90) automaticFlags.push("Possibly too easy");
    if (seen.length >= 8 && (correctRate ?? 100) <= 25) automaticFlags.push("Possibly too difficult or unclear");
    if (seen.length >= 8 && optionCounts.some((item) => !item.correct && item.count === 0)) automaticFlags.push("A distractor is not functioning");
    if (discrimination !== null && discrimination < 0) automaticFlags.push("Negative separation signal");
    const review = reviewMap.get(question.id);
    return { ...question, attempts: seen.length, correctRate, discrimination, optionCounts, automaticFlags, decision: review?.decision ?? "active", reviewerNote: review?.reviewerNote ?? "", updatedAt: review?.updatedAt ?? "" };
  });
  return {
    items,
    summary: {
      total: items.length,
      delivered: items.filter((item) => item.attempts > 0).length,
      reviewNeeded: items.filter((item) => item.decision === "review_needed" || item.automaticFlags.length && item.attempts >= 8).length,
      retired: items.filter((item) => item.decision === "retired").length,
    },
    methodology: "Personal repeated-attempt signals, not cohort psychometrics. Difficulty and distractor flags need at least 8 attempts; separation needs at least 4 stronger and 4 weaker attempts.",
  };
}

