import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { clinicalCases } from "@/lib/learning-engine";
import { saveLearningAttempt } from "@/lib/learning-attempts";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const rows = await getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt));
    return Response.json({ attempts: rows.filter((row) => row.activityType === "clinical_case") });
  } catch { return Response.json({ error: "Case history could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { caseId?: string; decisions?: Record<string, number> };
    const clinicalCase = clinicalCases.find((item) => item.id === body.caseId);
    if (!clinicalCase || !body.decisions || clinicalCase.steps.some((step) => {
      const decision = body.decisions?.[step.id];
      return !Number.isInteger(decision) || Number(decision) < 0 || Number(decision) >= step.options.length;
    })) {
      return Response.json({ error: "Complete every case decision before finishing." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const saved = await saveLearningAttempt({ ownerId, activityType: "clinical_case", activityId: clinicalCase.id, subject: "Internal Medicine I", system: "Cardiovascular", answers: body.decisions, items: clinicalCase.steps });
    return Response.json(saved, { status: 201 });
  } catch { return Response.json({ error: "The clinical case could not be saved." }, { status: 500 }); }
}
