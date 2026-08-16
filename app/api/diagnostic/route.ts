import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { diagnosticAssessment } from "@/lib/learning-engine";
import { saveLearningAttempt } from "@/lib/learning-attempts";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const attempts = await getDb().select().from(learningActivityAttempts)
      .where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt));
    return Response.json({ attempts: attempts.filter((attempt) => attempt.activityType === "diagnostic") });
  } catch { return Response.json({ error: "Diagnostic history could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { assessmentId?: string; answers?: Record<string, number> };
    if (body.assessmentId !== diagnosticAssessment.id || !body.answers || diagnosticAssessment.questions.some((question) => {
      const answer = body.answers?.[question.id];
      return !Number.isInteger(answer) || Number(answer) < 0 || Number(answer) >= question.options.length;
    })) {
      return Response.json({ error: "Answer every diagnostic question before finishing." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const domainScores = Object.fromEntries((["cardiac-cycle", "cardiac-output"] as const).map((domain) => {
      const items = diagnosticAssessment.questions.filter((question) => question.domain === domain);
      const correct = items.filter((question) => body.answers?.[question.id] === question.correctOption).length;
      return [domain, Math.round(correct / items.length * 100)];
    }));
    const saved = await saveLearningAttempt({
      ownerId, activityType: "diagnostic", activityId: diagnosticAssessment.id, subject: "Internal Medicine I", system: "Cardiovascular",
      answers: body.answers, items: diagnosticAssessment.questions, extra: { domainScores },
    });
    const weakDomain = domainScores["cardiac-cycle"] <= domainScores["cardiac-output"] ? "cardiac-cycle" : "cardiac-output";
    const needsRepair = domainScores[weakDomain] < 75;
    return Response.json({
      ...saved,
      domainScores,
      next: needsRepair
        ? { href: `/learn/cardiovascular/${weakDomain}`, label: weakDomain === "cardiac-cycle" ? "Repair cardiac-cycle foundations" : "Repair cardiac-output foundations" }
        : { href: "/learn", label: "See your adaptive next step" },
    }, { status: 201 });
  } catch { return Response.json({ error: "The diagnostic could not be saved." }, { status: 500 }); }
}
