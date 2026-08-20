import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts, mistakeNotebook, recallReviews } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { findVoicePrompt, scoreVoiceResponse } from "@/lib/voice-teach-back";

type Confidence = "low" | "medium" | "high";
type InputMode = "voice" | "typed";

function correctionKey(promptId: string, label: string) {
  return `voice:${promptId}:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function parseAttempt(detailsJson: string) {
  try {
    const details = JSON.parse(detailsJson) as { promptId?: string; score?: number; matched?: string[]; missing?: string[]; confidence?: Confidence; inputMode?: InputMode; sourceState?: string };
    return details;
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [activityRows, reviewRows] = await Promise.all([
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt)),
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)).orderBy(desc(recallReviews.updatedAt)),
    ]);
    const attempts = activityRows.filter((row) => row.activityType === "voice_teach_back").slice(0, 20).map((row) => ({ id: row.id, activityId: row.activityId, completedAt: row.completedAt, ...parseAttempt(row.detailsJson) }));
    const corrections = reviewRows.filter((row) => row.questionKey.startsWith("voice:")).map((row) => ({ id: row.id, lessonSlug: row.lessonSlug, questionKey: row.questionKey, question: row.question, answer: row.answer, dueAt: row.dueAt, lastRating: row.lastRating, due: row.dueAt <= new Date().toISOString() }));
    return Response.json({ attempts, corrections, dueCorrections: corrections.filter((item) => item.due).length });
  } catch {
    return Response.json({ error: "Voice teach-back history could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { promptId?: string; response?: string; confidence?: Confidence; inputMode?: InputMode };
    const prompt = findVoicePrompt(body.promptId?.trim() ?? "");
    const response = body.response?.trim() ?? "";
    const confidence = body.confidence;
    const inputMode = body.inputMode;
    if (!prompt || response.length < 10 || response.length > 4000 || !confidence || !["low", "medium", "high"].includes(confidence) || !inputMode || !["voice", "typed"].includes(inputMode)) {
      return Response.json({ error: "Choose a prompt, give a complete explanation, and record your confidence." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const scored = scoreVoiceResponse(prompt, response);
    const completedAt = new Date().toISOString();
    const nextReviewAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const attemptId = crypto.randomUUID();
    await getDb().insert(learningActivityAttempts).values({
      id: attemptId,
      ownerId,
      activityType: "voice_teach_back",
      activityId: prompt.id,
      subject: "Internal Medicine I",
      system: "Cardiovascular",
      correctCount: scored.correct ? 1 : 0,
      totalCount: 1,
      detailsJson: JSON.stringify({
        promptId: prompt.id,
        lessonSlug: prompt.lessonSlug,
        response,
        confidence,
        inputMode,
        score: scored.score,
        matched: scored.matched,
        missing: scored.missing,
        sourceState: prompt.sourceState,
        results: [{ questionId: prompt.id, prompt: prompt.prompt, correct: scored.correct, score: scored.score, correction: prompt.modelAnswer, sourceLabel: prompt.sourceLabel }],
      }),
      completedAt,
    });

    const assessmentId = `voice_teach_back:${prompt.id}`;
    if (scored.correct) {
      await getDb().update(mistakeNotebook).set({ status: "resolved", updatedAt: completedAt }).where(and(eq(mistakeNotebook.ownerId, ownerId), eq(mistakeNotebook.assessmentId, assessmentId), eq(mistakeNotebook.questionKey, prompt.id)));
    } else {
      const values = {
        subject: "Internal Medicine I",
        lessonSlug: prompt.lessonSlug,
        prompt: prompt.prompt,
        originalAnswer: response,
        correctedConcept: prompt.modelAnswer,
        reason: scored.missing.length ? `Missing reasoning links: ${scored.missing.join(", ")}` : "The explanation needs another retrieval attempt.",
        sourceLabel: prompt.sourceLabel,
        status: "open",
        nextReviewAt,
        updatedAt: completedAt,
      };
      await getDb().insert(mistakeNotebook).values({ id: crypto.randomUUID(), ownerId, assessmentId, questionKey: prompt.id, ...values, createdAt: completedAt }).onConflictDoUpdate({ target: [mistakeNotebook.ownerId, mistakeNotebook.assessmentId, mistakeNotebook.questionKey], set: values });
    }

    for (const label of scored.missing) {
      const questionKey = correctionKey(prompt.id, label);
      const values = {
        question: `Teach back “${prompt.title}” and include this reasoning link: ${label}.`,
        answer: prompt.modelAnswer,
        lastRating: "again",
        repetitions: 0,
        intervalDays: 1,
        easeScore: 230,
        dueAt: nextReviewAt,
        lastReviewedAt: completedAt,
        updatedAt: completedAt,
      };
      await getDb().insert(recallReviews).values({ id: crypto.randomUUID(), ownerId, lessonSlug: prompt.lessonSlug, questionKey, ...values }).onConflictDoUpdate({ target: [recallReviews.ownerId, recallReviews.lessonSlug, recallReviews.questionKey], set: values });
    }

    return Response.json({ attemptId, ...scored, modelAnswer: prompt.modelAnswer, sourceLabel: prompt.sourceLabel, sourceState: prompt.sourceState, nextReviewAt: scored.missing.length ? nextReviewAt : null, scheduledCorrections: scored.missing.length, completedAt }, { status: 201 });
  } catch {
    return Response.json({ error: "The voice teach-back could not be saved." }, { status: 500 });
  }
}
