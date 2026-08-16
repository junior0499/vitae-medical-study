import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { getLessonSources } from "@/lib/lesson-sources";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();

  const lessonSlug = new URL(request.url).searchParams.get("lesson")?.trim() ?? "";
  const sources = getLessonSources(lessonSlug);
  if (!lessonSlug || !sources.length) {
    return Response.json({ error: "A known lesson is required." }, { status: 404 });
  }

  try {
    await ensureVitaeSchema();
    const reviews = await getDb().select().from(alignmentReviews)
      .where(eq(alignmentReviews.ownerId, ownerId));
    const decisions = new Map(reviews.map((review) => [review.alignmentId, review.decision]));

    return Response.json({
      lessonSlug,
      sourceMode: "Reading references only. Lesson explanations are professor-authored until exact source extraction is available.",
      sources: sources.map((source) => ({
        ...source,
        decision: decisions.get(source.alignmentId) ?? "pending",
      })),
    });
  } catch {
    return Response.json({ error: "The lesson source trail could not be loaded." }, { status: 500 });
  }
}
