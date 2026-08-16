import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assessmentAttempts, mistakeNotebook } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { assessmentSets, findAssessment } from "@/lib/assessment-bank";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const attempts = await getDb().select().from(assessmentAttempts)
      .where(eq(assessmentAttempts.ownerId, ownerId)).orderBy(desc(assessmentAttempts.completedAt));
    return Response.json({
      assessments: assessmentSets.map((assessment) => ({
        id: assessment.id,
        subject: assessment.subject,
        title: assessment.title,
        subtitle: assessment.subtitle,
        timeMinutes: assessment.timeMinutes,
        questionCount: assessment.questions.length,
      })),
      attempts,
    });
  } catch {
    return Response.json({ error: "Assessments could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { assessmentId?: string; answers?: Record<string, number> };
    const assessment = findAssessment(body.assessmentId?.trim() ?? "");
    if (!assessment || !body.answers || typeof body.answers !== "object") {
      return Response.json({ error: "Choose a valid assessment and answers." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const completedAt = new Date().toISOString();
    const attemptId = crypto.randomUUID();
    const results = assessment.questions.map((question) => {
      const selected = Number(body.answers?.[question.id]);
      const answered = Number.isInteger(selected) && selected >= 0 && selected < question.options.length;
      return {
        questionId: question.id,
        selected: answered ? selected : -1,
        correct: answered && selected === question.correctOption,
        correctOption: question.correctOption,
        correction: question.correction,
        sourceLabel: question.sourceLabel,
      };
    });
    const correctCount = results.filter((result) => result.correct).length;
    await getDb().insert(assessmentAttempts).values({
      id: attemptId,
      ownerId,
      assessmentId: assessment.id,
      subject: assessment.subject,
      lessonSlug: "cardiovascular-foundations",
      questionType: "mcq",
      correctCount,
      totalCount: assessment.questions.length,
      answersJson: JSON.stringify(body.answers),
      completedAt,
    });

    for (const [index, question] of assessment.questions.entries()) {
      const result = results[index];
      if (result.correct) {
        await getDb().update(mistakeNotebook).set({ status: "resolved", updatedAt: completedAt })
          .where(and(
            eq(mistakeNotebook.ownerId, ownerId),
            eq(mistakeNotebook.assessmentId, assessment.id),
            eq(mistakeNotebook.questionKey, question.id),
          ));
        continue;
      }
      const nextReviewAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const selectedAnswer = result.selected >= 0 ? question.options[result.selected] : "No answer submitted";
      const values = {
        subject: assessment.subject,
        lessonSlug: question.lessonSlug,
        prompt: question.prompt,
        originalAnswer: selectedAnswer,
        correctedConcept: question.correction,
        reason: "",
        sourceLabel: question.sourceLabel,
        status: "open",
        nextReviewAt,
        updatedAt: completedAt,
      };
      await getDb().insert(mistakeNotebook).values({
        id: crypto.randomUUID(), ownerId, assessmentId: assessment.id, questionKey: question.id,
        ...values, createdAt: completedAt,
      }).onConflictDoUpdate({
        target: [mistakeNotebook.ownerId, mistakeNotebook.assessmentId, mistakeNotebook.questionKey],
        set: values,
      });
    }

    return Response.json({ attemptId, correctCount, totalCount: assessment.questions.length, results }, { status: 201 });
  } catch {
    return Response.json({ error: "The assessment could not be saved." }, { status: 500 });
  }
}
