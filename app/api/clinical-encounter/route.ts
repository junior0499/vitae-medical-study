import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { clinicalEncounter } from "@/lib/clinical-encounter";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { saveLearningAttempt } from "@/lib/learning-attempts";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const rows = await getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt));
    return Response.json({ attempts: rows.filter((row) => row.activityType === "clinical_encounter") });
  } catch { return Response.json({ error: "Encounter history could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { encounterId?: string; decisions?: Record<string, number> };
    if (body.encounterId !== clinicalEncounter.id || !body.decisions || clinicalEncounter.steps.some((step) => {
      const decision = body.decisions?.[step.id];
      return !Number.isInteger(decision) || Number(decision) < 0 || Number(decision) >= step.options.length;
    })) return Response.json({ error: "Complete every encounter stage before finishing." }, { status: 400 });
    await ensureVitaeSchema();
    const saved = await saveLearningAttempt({ ownerId, activityType: "clinical_encounter", activityId: clinicalEncounter.id, subject: "Internal Medicine I", system: "Cardiovascular", answers: body.decisions, items: clinicalEncounter.steps, extra: { sourceBoundaryHonoured: body.decisions["encounter-management-gate"] === 2 } });
    return Response.json(saved, { status: 201 });
  } catch { return Response.json({ error: "The encounter could not be saved." }, { status: 500 }); }
}

