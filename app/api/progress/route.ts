import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonProgress } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();

  try {
    await ensureVitaeSchema();
    const rows = await getDb().select().from(lessonProgress)
      .where(eq(lessonProgress.ownerId, ownerId))
      .orderBy(desc(lessonProgress.updatedAt));
    return Response.json({ progress: rows });
  } catch {
    return Response.json({ error: "Progress could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();

  try {
    const body = await request.json() as {
      lessonSlug?: string;
      completedPoints?: number;
      totalPoints?: number;
      status?: string;
    };
    const lessonSlug = body.lessonSlug?.trim() ?? "";
    const totalPoints = Math.max(1, Math.min(50, Math.trunc(body.totalPoints ?? 1)));
    const completedPoints = Math.max(0, Math.min(totalPoints, Math.trunc(body.completedPoints ?? 0)));
    const status = body.status === "complete" ? "complete" : "in_progress";
    if (!lessonSlug || lessonSlug.length > 120) {
      return Response.json({ error: "A valid lesson is required." }, { status: 400 });
    }

    await ensureVitaeSchema();
    const now = new Date().toISOString();
    const [saved] = await getDb().insert(lessonProgress).values({
      id: crypto.randomUUID(), ownerId, lessonSlug, completedPoints, totalPoints, status, updatedAt: now,
    }).onConflictDoUpdate({
      target: [lessonProgress.ownerId, lessonProgress.lessonSlug],
      set: { completedPoints, totalPoints, status, updatedAt: now },
    }).returning();
    return Response.json({ progress: saved });
  } catch {
    return Response.json({ error: "Progress could not be saved." }, { status: 500 });
  }
}
