import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts, mistakeNotebook } from "@/db/schema";

export type ScoredLearningItem = {
  id: string;
  lessonSlug: string;
  prompt: string;
  options: string[];
  correctOption: number;
  correction: string;
  sourceLabel: string;
};

export async function saveLearningAttempt(input: {
  ownerId: string;
  activityType: "diagnostic" | "clinical_case" | "visual_lab";
  activityId: string;
  subject: string;
  system: string;
  answers: Record<string, number>;
  items: ScoredLearningItem[];
  extra?: Record<string, unknown>;
}) {
  const completedAt = new Date().toISOString();
  const results = input.items.map((item) => {
    const selected = Number(input.answers[item.id]);
    const answered = Number.isInteger(selected) && selected >= 0 && selected < item.options.length;
    return { questionId: item.id, selected: answered ? selected : -1, correct: answered && selected === item.correctOption, correctOption: item.correctOption, correction: item.correction, sourceLabel: item.sourceLabel };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const attemptId = crypto.randomUUID();
  await getDb().insert(learningActivityAttempts).values({
    id: attemptId,
    ownerId: input.ownerId,
    activityType: input.activityType,
    activityId: input.activityId,
    subject: input.subject,
    system: input.system,
    correctCount,
    totalCount: input.items.length,
    detailsJson: JSON.stringify({ answers: input.answers, results, ...input.extra }),
    completedAt,
  });

  for (const [index, item] of input.items.entries()) {
    const result = results[index];
    const assessmentId = `${input.activityType}:${input.activityId}`;
    if (result.correct) {
      await getDb().update(mistakeNotebook).set({ status: "resolved", updatedAt: completedAt })
        .where(and(eq(mistakeNotebook.ownerId, input.ownerId), eq(mistakeNotebook.assessmentId, assessmentId), eq(mistakeNotebook.questionKey, item.id)));
      continue;
    }
    const selectedAnswer = result.selected >= 0 ? item.options[result.selected] : "No answer submitted";
    const values = {
      subject: input.subject,
      lessonSlug: item.lessonSlug,
      prompt: item.prompt,
      originalAnswer: selectedAnswer,
      correctedConcept: item.correction,
      reason: "",
      sourceLabel: item.sourceLabel,
      status: "open",
      nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: completedAt,
    };
    await getDb().insert(mistakeNotebook).values({
      id: crypto.randomUUID(), ownerId: input.ownerId, assessmentId, questionKey: item.id, ...values, createdAt: completedAt,
    }).onConflictDoUpdate({
      target: [mistakeNotebook.ownerId, mistakeNotebook.assessmentId, mistakeNotebook.questionKey],
      set: values,
    });
  }
  return { attemptId, correctCount, totalCount: input.items.length, results, completedAt };
}

