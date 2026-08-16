import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { interleavedSession } from "@/lib/advanced-learning";

type StoredDetails = {
  confidence?: Record<string, "low" | "medium" | "high">;
  results?: Array<{ questionId: string; correct: boolean; correction: string; sourceLabel: string }>;
};

function parseDetails(value: string): StoredDetails {
  try { return JSON.parse(value) as StoredDetails; } catch { return {}; }
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const rows = await getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt));
    const attempts = rows.filter((row) => row.activityType === "interleaved_review");
    const questionMap = new Map(interleavedSession.questions.map((question) => [question.id, question]));
    const judgements = attempts.flatMap((attempt) => {
      const details = parseDetails(attempt.detailsJson);
      return (details.results ?? []).map((result) => ({
        ...result,
        confidence: details.confidence?.[result.questionId] ?? "medium",
        prompt: questionMap.get(result.questionId)?.prompt ?? result.questionId,
        domain: questionMap.get(result.questionId)?.domain ?? "Cardiovascular",
        completedAt: attempt.completedAt,
      }));
    });
    const highConfidenceWrong = judgements.filter((item) => item.confidence === "high" && !item.correct);
    const lowConfidenceCorrect = judgements.filter((item) => item.confidence === "low" && item.correct);
    const calibrated = judgements.filter((item) => (item.confidence === "high" && item.correct) || (item.confidence === "low" && !item.correct) || item.confidence === "medium");
    const confidenceValue = { low: 1, medium: 2, high: 3 } as const;
    const averageConfidence = judgements.length ? Math.round(judgements.reduce((sum, item) => sum + confidenceValue[item.confidence], 0) / judgements.length * 10) / 10 : 0;
    return Response.json({ summary: { attempts: attempts.length, judgements: judgements.length, calibrated: calibrated.length, highConfidenceWrong: highConfidenceWrong.length, lowConfidenceCorrect: lowConfidenceCorrect.length, averageConfidence }, risks: highConfidenceWrong.slice(0, 8), strengths: lowConfidenceCorrect.slice(0, 5) });
  } catch { return Response.json({ error: "Confidence evidence could not be loaded." }, { status: 500 }); }
}
