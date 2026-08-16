import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { visualChallenges } from "@/lib/learning-engine";
import { saveLearningAttempt } from "@/lib/learning-attempts";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const rows = await getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt));
    return Response.json({ attempts: rows.filter((row) => row.activityType === "visual_lab") });
  } catch { return Response.json({ error: "Visual-lab history could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { labId?: string; answers?: Record<string, number> };
    if (body.labId !== "cardiovascular-visual-lab-01" || !body.answers || visualChallenges.some((item) => {
      const answer = body.answers?.[item.id];
      return !Number.isInteger(answer) || Number(answer) < 0 || Number(answer) >= item.options.length;
    })) {
      return Response.json({ error: "Interpret every visual before finishing the lab." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const saved = await saveLearningAttempt({ ownerId, activityType: "visual_lab", activityId: body.labId, subject: "Internal Medicine I", system: "Cardiovascular", answers: body.answers, items: visualChallenges });
    return Response.json(saved, { status: 201 });
  } catch { return Response.json({ error: "The visual lab could not be saved." }, { status: 500 }); }
}
