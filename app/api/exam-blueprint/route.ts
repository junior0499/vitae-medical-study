import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, learningActivityAttempts, lessonProgress } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { buildExamBlueprint } from "@/lib/advanced-learning";
import { coverageObjectives } from "@/lib/subject-alignments";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [reviews, progress, activities] = await Promise.all([
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)),
    ]);
    const reviewMap = new Map(reviews.map((review) => [review.alignmentId, review.decision]));
    const cardiovascularEvidence = progress.filter((item) => item.lessonSlug === "cardiac-cycle" || item.lessonSlug === "cardiac-output").length + activities.filter((item) => item.system === "Cardiovascular").length;
    const objectives = coverageObjectives.map((objective) => {
      const blueprint = buildExamBlueprint(objective);
      const sourceDecision = reviewMap.get(objective.id) ?? "pending";
      const liveEvidence = objective.id === "cv-1-4" ? cardiovascularEvidence : 0;
      return { ...blueprint, sourceDecision, liveEvidence, readiness: liveEvidence ? "building" : sourceDecision === "approved" ? "ready_to_build" : objective.mappingStatus === "missing" ? "source_missing" : "mapped" };
    });
    const modalityCounts = Object.fromEntries(["MCQ", "SAQ", "OSCE", "Viva"].map((modality) => [modality, objectives.filter((item) => item.modalities.includes(modality as "MCQ" | "SAQ" | "OSCE" | "Viva")).length]));
    return Response.json({ objectives, summary: { total: objectives.length, high: objectives.filter((item) => item.importance === "High").length, withEvidence: objectives.filter((item) => item.liveEvidence > 0).length, sourceMissing: objectives.filter((item) => item.readiness === "source_missing").length, modalityCounts } });
  } catch { return Response.json({ error: "The exam blueprint could not be loaded." }, { status: 500 }); }
}
