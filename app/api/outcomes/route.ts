import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assessmentAttempts, learningActivityAttempts, lessonProgress, mistakeNotebook, recallReviews } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { calculateLearningOutcomes } from "@/lib/learning-outcomes";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [progress, activities, assessments, reviews, mistakes] = await Promise.all([
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)),
      getDb().select().from(assessmentAttempts).where(eq(assessmentAttempts.ownerId, ownerId)),
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)),
      getDb().select().from(mistakeNotebook).where(eq(mistakeNotebook.ownerId, ownerId)),
    ]);
    return Response.json(calculateLearningOutcomes({ progress, activities, assessments, reviews, mistakes }));
  } catch {
    return Response.json({ error: "Learning outcomes could not be calculated." }, { status: 500 });
  }
}
