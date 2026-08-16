function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function calculateMastery(input: {
  progress: Array<{ completedPoints: number; totalPoints: number; status: string }>;
  notes: Array<{ content: string }>;
  attempts: Array<{ correctCount: number; totalCount: number }>;
  activities: Array<{ activityType: string; correctCount: number; totalCount: number }>;
  reviews: Array<{ lastRating: string }>;
  mistakes: Array<{ status: string }>;
}) {
  const progressComponent = Math.round(average(input.progress.map((item) => Math.min(1, item.completedPoints / Math.max(1, item.totalPoints)))) * 30);
  const notesComponent = Math.round(average(input.notes.map((item) => Math.min(1, item.content.trim().length / 200))) * 10);
  const totalAnswered = input.attempts.reduce((sum, item) => sum + item.totalCount, 0);
  const totalCorrect = input.attempts.reduce((sum, item) => sum + item.correctCount, 0);
  const assessmentComponent = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 20) : 0;
  const activityAnswered = input.activities.reduce((sum, item) => sum + item.totalCount, 0);
  const activityCorrect = input.activities.reduce((sum, item) => sum + item.correctCount, 0);
  const applicationComponent = activityAnswered ? Math.round((activityCorrect / activityAnswered) * 20) : 0;
  const reviewValue = average(input.reviews.map((item) => item.lastRating === "good" ? 1 : item.lastRating === "hard" ? 0.6 : 0.2));
  const reviewComponent = Math.round(reviewValue * 20);
  const score = Math.min(100, progressComponent + notesComponent + assessmentComponent + applicationComponent + reviewComponent);
  return {
    score,
    level: score >= 80 ? "Strong" : score >= 60 ? "Practised" : score >= 30 ? "Building" : "Starting",
    components: { lessonCompletion: progressComponent, notes: notesComponent, assessments: assessmentComponent, application: applicationComponent, recall: reviewComponent },
    evidence: {
      lessons: input.progress.length,
      completedLessons: input.progress.filter((item) => item.status === "complete").length,
      noteCount: input.notes.filter((item) => item.content.trim()).length,
      questionsAnswered: totalAnswered,
      applicationQuestions: activityAnswered,
      diagnosticAttempts: input.activities.filter((item) => item.activityType === "diagnostic").length,
      caseAttempts: input.activities.filter((item) => item.activityType === "clinical_case").length,
      visualLabAttempts: input.activities.filter((item) => item.activityType === "visual_lab").length,
      vivaAttempts: input.activities.filter((item) => item.activityType === "oral_viva").length,
      interleavedAttempts: input.activities.filter((item) => item.activityType === "interleaved_review").length,
      reviewCards: input.reviews.length,
      openMistakes: input.mistakes.filter((item) => item.status === "open").length,
    },
  };
}
