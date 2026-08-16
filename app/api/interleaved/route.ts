import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { interleavedSession } from "@/lib/advanced-learning";
import { saveLearningAttempt } from "@/lib/learning-attempts";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const rows = await getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt));
    return Response.json({ attempts: rows.filter((row) => row.activityType === "interleaved_review") });
  } catch { return Response.json({ error: "Interleaved-review history could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { sessionId?: string; answers?: Record<string, number>; confidence?: Record<string, "low" | "medium" | "high"> };
    const invalidAnswer = interleavedSession.questions.some((question) => {
      const answer = body.answers?.[question.id];
      return !Number.isInteger(answer) || Number(answer) < 0 || Number(answer) >= question.options.length;
    });
    const invalidConfidence = interleavedSession.questions.some((question) => !["low", "medium", "high"].includes(body.confidence?.[question.id] ?? ""));
    if (body.sessionId !== interleavedSession.id || !body.answers || !body.confidence || invalidAnswer || invalidConfidence) {
      return Response.json({ error: "Answer every mixed question and record your confidence." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const saved = await saveLearningAttempt({ ownerId, activityType: "interleaved_review", activityId: interleavedSession.id, subject: "Internal Medicine I", system: "Cardiovascular", answers: body.answers, items: interleavedSession.questions, extra: { confidence: body.confidence } });
    const highConfidenceWrong = saved.results.filter((result) => !result.correct && body.confidence?.[result.questionId] === "high").length;
    return Response.json({ ...saved, highConfidenceWrong }, { status: 201 });
  } catch { return Response.json({ error: "The interleaved review could not be saved." }, { status: 500 }); }
}
