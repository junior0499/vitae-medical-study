import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { recallReviews, recallReviewSignals } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { calculateAdaptiveReview } from "@/lib/adaptive-spacing";

const ratings = new Set(["again", "hard", "good"]);
const difficulties = new Set(["easy", "medium", "hard"]);
const confidences = new Set(["low", "medium", "high"]);

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [rows, signals] = await Promise.all([
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)).orderBy(asc(recallReviews.dueAt)),
      getDb().select().from(recallReviewSignals).where(eq(recallReviewSignals.ownerId, ownerId)),
    ]);
    const signalMap = new Map(signals.map((signal) => [`${signal.lessonSlug}:${signal.questionKey}`, signal]));
    const enriched = rows.map((row) => ({ ...row, signal: signalMap.get(`${row.lessonSlug}:${row.questionKey}`) ?? null }));
    const now = new Date().toISOString();
    return Response.json({ due: enriched.filter((row) => row.dueAt <= now), upcoming: enriched.filter((row) => row.dueAt > now), total: rows.length });
  } catch {
    return Response.json({ error: "The review queue could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { lessonSlug?: string; questionKey?: string; question?: string; answer?: string; rating?: string; difficulty?: string; confidence?: string; responseMs?: number };
    const lessonSlug = body.lessonSlug?.trim().slice(0, 120) ?? "";
    const questionKey = body.questionKey?.trim().slice(0, 120) ?? "";
    const question = body.question?.trim().slice(0, 1000) ?? "";
    const answer = body.answer?.trim().slice(0, 2000) ?? "";
    const rating = body.rating?.trim() ?? "";
    const difficulty = body.difficulty?.trim() || "medium";
    const confidence = body.confidence?.trim() || "medium";
    if (!lessonSlug || !questionKey || !question || !answer || !ratings.has(rating) || !difficulties.has(difficulty) || !confidences.has(confidence)) {
      return Response.json({ error: "A valid recall card and rating are required." }, { status: 400 });
    }

    await ensureVitaeSchema();
    const [existing, signal] = await Promise.all([
      getDb().select().from(recallReviews).where(and(eq(recallReviews.ownerId, ownerId), eq(recallReviews.lessonSlug, lessonSlug), eq(recallReviews.questionKey, questionKey))).limit(1).then((rows) => rows[0] ?? null),
      getDb().select().from(recallReviewSignals).where(and(eq(recallReviewSignals.ownerId, ownerId), eq(recallReviewSignals.lessonSlug, lessonSlug), eq(recallReviewSignals.questionKey, questionKey))).limit(1).then((rows) => rows[0] ?? null),
    ]);
    const now = new Date();
    const schedule = calculateAdaptiveReview({
      existing,
      signal,
      rating: rating as "again" | "hard" | "good",
      difficulty: difficulty as "easy" | "medium" | "hard",
      confidence: confidence as "low" | "medium" | "high",
      responseMs: body.responseMs,
      now,
    });

    const updatedAt = now.toISOString();
    const values = { question, answer, lastRating: rating, repetitions: schedule.repetitions, intervalDays: schedule.intervalDays, easeScore: schedule.easeScore, dueAt: schedule.dueAt, lastReviewedAt: updatedAt, updatedAt };
    const [saved] = await getDb().insert(recallReviews).values({
      id: crypto.randomUUID(), ownerId, lessonSlug, questionKey, ...values,
    }).onConflictDoUpdate({
      target: [recallReviews.ownerId, recallReviews.lessonSlug, recallReviews.questionKey], set: values,
    }).returning();
    const signalValues = { difficulty, confidence, wasCorrect: schedule.correct ? 1 : 0, lapseCount: schedule.lapseCount, reviewCount: schedule.reviewCount, accuracyStreak: schedule.accuracyStreak, averageResponseMs: schedule.averageResponseMs, forgettingScore: schedule.forgettingScore, nextIntervalDays: schedule.nextIntervalDays, updatedAt };
    const [savedSignal] = await getDb().insert(recallReviewSignals).values({ id: crypto.randomUUID(), ownerId, lessonSlug, questionKey, ...signalValues }).onConflictDoUpdate({ target: [recallReviewSignals.ownerId, recallReviewSignals.lessonSlug, recallReviewSignals.questionKey], set: signalValues }).returning();
    return Response.json({ review: saved, signal: savedSignal, rationale: schedule.rationale });
  } catch {
    return Response.json({ error: "The recall review could not be scheduled." }, { status: 500 });
  }
}
