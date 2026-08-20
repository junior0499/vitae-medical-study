import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts, mistakeNotebook } from "@/db/schema";

export type LearningActivityType = "diagnostic" | "clinical_case" | "clinical_encounter" | "visual_lab" | "oral_viva" | "voice_teach_back" | "diagnostic_justification" | "counterfactual_transfer" | "interleaved_review" | "professor_dialogue" | "cumulative_progress_test";

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
  activityType: LearningActivityType;
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

export async function saveVivaAttempt(input: {
  ownerId: string;
  activityId: string;
  responses: Record<string, string>;
  results: Array<{ questionId: string; lessonSlug: string; prompt: string; score: number; correct: boolean; modelAnswer: string; sourceLabel: string }>;
}) {
  const completedAt = new Date().toISOString();
  const attemptId = crypto.randomUUID();
  const correctCount = input.results.filter((result) => result.correct).length;
  await getDb().insert(learningActivityAttempts).values({
    id: attemptId,
    ownerId: input.ownerId,
    activityType: "oral_viva",
    activityId: input.activityId,
    subject: "Internal Medicine I",
    system: "Cardiovascular",
    correctCount,
    totalCount: input.results.length,
    detailsJson: JSON.stringify({ responses: input.responses, results: input.results }),
    completedAt,
  });
  const assessmentId = `oral_viva:${input.activityId}`;
  for (const result of input.results) {
    if (result.correct) {
      await getDb().update(mistakeNotebook).set({ status: "resolved", updatedAt: completedAt })
        .where(and(eq(mistakeNotebook.ownerId, input.ownerId), eq(mistakeNotebook.assessmentId, assessmentId), eq(mistakeNotebook.questionKey, result.questionId)));
      continue;
    }
    const values = {
      subject: "Internal Medicine I",
      lessonSlug: result.lessonSlug,
      prompt: result.prompt,
      originalAnswer: input.responses[result.questionId] || "No answer submitted",
      correctedConcept: result.modelAnswer,
      reason: "",
      sourceLabel: result.sourceLabel,
      status: "open",
      nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: completedAt,
    };
    await getDb().insert(mistakeNotebook).values({ id: crypto.randomUUID(), ownerId: input.ownerId, assessmentId, questionKey: result.questionId, ...values, createdAt: completedAt })
      .onConflictDoUpdate({ target: [mistakeNotebook.ownerId, mistakeNotebook.assessmentId, mistakeNotebook.questionKey], set: values });
  }
  return { attemptId, correctCount, totalCount: input.results.length, results: input.results, completedAt };
}

export async function saveProfessorAttempt(input: {
  ownerId: string;
  promptId: string;
  lessonSlug: string;
  prompt: string;
  response: string;
  confidence: "low" | "medium" | "high";
  hintLevel: number;
  score: number;
  correct: boolean;
  matched: string[];
  missing: string[];
  modelAnswer: string;
  sourceLabel: string;
}) {
  const completedAt = new Date().toISOString();
  const attemptId = crypto.randomUUID();
  await getDb().insert(learningActivityAttempts).values({
    id: attemptId,
    ownerId: input.ownerId,
    activityType: "professor_dialogue",
    activityId: input.promptId,
    subject: "Internal Medicine I",
    system: "Cardiovascular",
    correctCount: input.correct ? 1 : 0,
    totalCount: 1,
    detailsJson: JSON.stringify({ promptId: input.promptId, lessonSlug: input.lessonSlug, response: input.response, confidence: input.confidence, hintLevel: input.hintLevel, score: input.score, matched: input.matched, missing: input.missing }),
    completedAt,
  });

  const assessmentId = `professor_dialogue:${input.promptId}`;
  if (input.correct) {
    await getDb().update(mistakeNotebook).set({ status: "resolved", updatedAt: completedAt })
      .where(and(eq(mistakeNotebook.ownerId, input.ownerId), eq(mistakeNotebook.assessmentId, assessmentId), eq(mistakeNotebook.questionKey, input.promptId)));
  } else {
    const values = {
      subject: "Internal Medicine I",
      lessonSlug: input.lessonSlug,
      prompt: input.prompt,
      originalAnswer: input.response,
      correctedConcept: input.modelAnswer,
      reason: input.missing.length ? `Missing links: ${input.missing.join(", ")}` : "The explanation needs another retrieval attempt.",
      sourceLabel: input.sourceLabel,
      status: "open",
      nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: completedAt,
    };
    await getDb().insert(mistakeNotebook).values({ id: crypto.randomUUID(), ownerId: input.ownerId, assessmentId, questionKey: input.promptId, ...values, createdAt: completedAt })
      .onConflictDoUpdate({ target: [mistakeNotebook.ownerId, mistakeNotebook.assessmentId, mistakeNotebook.questionKey], set: values });
  }
  return { attemptId, score: input.score, correct: input.correct, matched: input.matched, missing: input.missing, completedAt };
}
