import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { recallReviews } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

const ratings = new Set(["again", "hard", "good"]);

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const rows = await getDb().select().from(recallReviews)
      .where(eq(recallReviews.ownerId, ownerId)).orderBy(asc(recallReviews.dueAt));
    const now = new Date().toISOString();
    return Response.json({ due: rows.filter((row) => row.dueAt <= now), upcoming: rows.filter((row) => row.dueAt > now), total: rows.length });
  } catch {
    return Response.json({ error: "The review queue could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { lessonSlug?: string; questionKey?: string; question?: string; answer?: string; rating?: string };
    const lessonSlug = body.lessonSlug?.trim().slice(0, 120) ?? "";
    const questionKey = body.questionKey?.trim().slice(0, 120) ?? "";
    const question = body.question?.trim().slice(0, 1000) ?? "";
    const answer = body.answer?.trim().slice(0, 2000) ?? "";
    const rating = body.rating?.trim() ?? "";
    if (!lessonSlug || !questionKey || !question || !answer || !ratings.has(rating)) {
      return Response.json({ error: "A valid recall card and rating are required." }, { status: 400 });
    }

    await ensureVitaeSchema();
    const [existing] = await getDb().select().from(recallReviews).where(and(
      eq(recallReviews.ownerId, ownerId), eq(recallReviews.lessonSlug, lessonSlug), eq(recallReviews.questionKey, questionKey),
    )).limit(1);
    const now = new Date();
    let repetitions = existing?.repetitions ?? 0;
    let intervalDays = existing?.intervalDays ?? 1;
    let easeScore = existing?.easeScore ?? 250;
    let dueAt: Date;

    if (rating === "again") {
      repetitions = 0; intervalDays = 0; easeScore = Math.max(130, easeScore - 20);
      dueAt = new Date(now.getTime() + 10 * 60 * 1000);
    } else if (rating === "hard") {
      repetitions += 1; intervalDays = Math.max(1, Math.round(intervalDays * 1.2)); easeScore = Math.max(130, easeScore - 15);
      dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    } else {
      repetitions += 1;
      intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.max(4, Math.round(intervalDays * easeScore / 100));
      easeScore = Math.min(300, easeScore + 5);
      dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }

    const updatedAt = now.toISOString();
    const values = { question, answer, lastRating: rating, repetitions, intervalDays, easeScore, dueAt: dueAt.toISOString(), lastReviewedAt: updatedAt, updatedAt };
    const [saved] = await getDb().insert(recallReviews).values({
      id: crypto.randomUUID(), ownerId, lessonSlug, questionKey, ...values,
    }).onConflictDoUpdate({
      target: [recallReviews.ownerId, recallReviews.lessonSlug, recallReviews.questionKey], set: values,
    }).returning();
    return Response.json({ review: saved });
  } catch {
    return Response.json({ error: "The recall review could not be scheduled." }, { status: 500 });
  }
}
