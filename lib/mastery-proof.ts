const topics = [
  { slug: "cardiac-cycle", title: "Cardiac cycle", href: "/learn/cardiovascular/cardiac-cycle" },
  { slug: "cardiac-output", title: "Cardiac output", href: "/learn/cardiovascular/cardiac-output" },
] as const;

function parseDetails(value: string) {
  try { return JSON.parse(value) as { lessonSlug?: string; domainScores?: Record<string, number>; results?: Array<{ questionId?: string; correct?: boolean }> }; } catch { return {}; }
}

function isTopicResult(slug: string, questionId = "") {
  if (slug === "cardiac-cycle") return /cycle|pressure|valve|s1|s2|iso|ejection/.test(questionId);
  return /output|afterload|contractility|preload|flow|calc|formula/.test(questionId);
}

export function calculateMasteryProof(input: {
  progress: Array<{ lessonSlug: string; status: string; updatedAt: string }>;
  activities: Array<{ activityType: string; completedAt: string; correctCount: number; totalCount: number; detailsJson: string }>;
  reviews: Array<{ lessonSlug: string; lastRating: string; repetitions: number }>;
  mistakes: Array<{ lessonSlug: string; status: string }>;
}) {
  const proofs = topics.map((topic) => {
    const lesson = input.progress.find((item) => item.lessonSlug === topic.slug);
    const recallCards = input.reviews.filter((item) => item.lessonSlug === topic.slug && item.repetitions > 0 && item.lastRating !== "again");
    const topicResults = input.activities.flatMap((activity) => {
      const details = parseDetails(activity.detailsJson);
      return (details.results ?? []).filter((result) => isTopicResult(topic.slug, result.questionId)).map((result) => ({ ...result, activityType: activity.activityType, completedAt: activity.completedAt }));
    });
    const recall = recallCards.length > 0 || topicResults.some((item) => item.correct && ["diagnostic", "interleaved_review", "cumulative_progress_test"].includes(item.activityType));
    const explain = input.activities.some((activity) => ["professor_dialogue", "voice_teach_back"].includes(activity.activityType) && activity.correctCount > 0 && parseDetails(activity.detailsJson).lessonSlug === topic.slug);
    const apply = topicResults.some((item) => item.correct && ["clinical_case", "visual_lab", "clinical_encounter", "diagnostic_justification", "counterfactual_transfer"].includes(item.activityType));
    const cumulative = input.activities.filter((activity) => activity.activityType === "cumulative_progress_test").map((activity) => ({ activity, details: parseDetails(activity.detailsJson) })).filter(({ details }) => (details.domainScores?.[topic.slug] ?? 0) >= 75).sort((a, b) => a.activity.completedAt.localeCompare(b.activity.completedAt));
    const delayedFromLesson = Boolean(lesson && cumulative.some(({ activity }) => new Date(activity.completedAt).getTime() - new Date(lesson.updatedAt).getTime() >= 7 * 86_400_000));
    const repeatedAcrossWeek = cumulative.length >= 2 && new Date(cumulative.at(-1)!.activity.completedAt).getTime() - new Date(cumulative[0].activity.completedAt).getTime() >= 7 * 86_400_000;
    const retain = delayedFromLesson || repeatedAcrossWeek;
    const openMistakes = input.mistakes.filter((item) => item.lessonSlug === topic.slug && item.status === "open").length;
    const gates = [
      { key: "recall", label: "Recall", passed: recall, evidence: recall ? `${recallCards.length || topicResults.filter((item) => item.correct).length} successful retrieval signal${(recallCards.length || topicResults.filter((item) => item.correct).length) === 1 ? "" : "s"}` : "Complete a recall card or source-trailed retrieval question" },
      { key: "explain", label: "Explain", passed: explain, evidence: explain ? "No-options Professor Mode or voice teach-back passed" : "Pass a no-options Professor Mode or voice teach-back explanation" },
      { key: "apply", label: "Apply", passed: apply, evidence: apply ? "Case, diagnostic, transfer, visual, or encounter application passed" : "Pass an application decision in a case, diagnostic justification, transfer case, visual lab, or encounter" },
      { key: "retain", label: "Retain", passed: retain, evidence: retain ? "At least 75% retained after a 7-day interval" : "Retest at 75% or more after at least 7 days" },
    ];
    const passedCount = gates.filter((gate) => gate.passed).length;
    const state = passedCount === 4 && openMistakes === 0 ? "mastered" : openMistakes > 0 || passedCount === 3 ? "fragile" : passedCount >= 2 ? "building" : passedCount === 1 ? "familiar" : "unfamiliar";
    return { ...topic, state, passedCount, openMistakes, gates };
  });
  return { topics: proofs, masteredCount: proofs.filter((topic) => topic.state === "mastered").length, totalTopics: proofs.length, rule: "Mastered requires recall + explanation + application + delayed retention, with no open correction." };
}
