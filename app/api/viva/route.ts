import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { vivaSession } from "@/lib/advanced-learning";
import { saveVivaAttempt } from "@/lib/learning-attempts";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9×\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const rows = await getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt));
    return Response.json({ attempts: rows.filter((row) => row.activityType === "oral_viva") });
  } catch { return Response.json({ error: "Viva history could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { sessionId?: string; responses?: Record<string, string> };
    if (body.sessionId !== vivaSession.id || !body.responses || vivaSession.questions.some((question) => !body.responses?.[question.id]?.trim())) {
      return Response.json({ error: "Answer every viva question before finishing." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const results = vivaSession.questions.map((question) => {
      const response = normalize(body.responses?.[question.id] ?? "");
      const matched = question.conceptGroups.filter((group) => group.some((concept) => response.includes(normalize(concept)))).length;
      const score = Math.round(matched / question.conceptGroups.length * 100);
      return { questionId: question.id, lessonSlug: question.lessonSlug, prompt: question.prompt, score, correct: score >= 70, modelAnswer: question.modelAnswer, sourceLabel: question.sourceLabel };
    });
    const saved = await saveVivaAttempt({ ownerId, activityId: vivaSession.id, responses: body.responses, results });
    return Response.json(saved, { status: 201 });
  } catch { return Response.json({ error: "The viva session could not be saved." }, { status: 500 }); }
}
