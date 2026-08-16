import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentSourceDetails, lessonDrafts, lessonProgress, recallReviews, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { coverageObjectives } from "@/lib/subject-alignments";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [reviews, drafts, progress, recall, documents, sourceDetails] = await Promise.all([
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)),
      getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
      getDb().select().from(documentSourceDetails).where(eq(documentSourceDetails.ownerId, ownerId)),
    ]);
    const reviewMap = new Map(reviews.map((review) => [review.alignmentId, review.decision]));
    const draftMap = new Map(drafts.map((draft) => [draft.alignmentId, draft]));
    const objectives = coverageObjectives.map((objective) => {
      const decision = reviewMap.get(objective.id) ?? "pending";
      const draft = draftMap.get(objective.id);
      const stage = draft ? "lesson_ready" : decision === "approved" ? "approved" : objective.mappingStatus === "missing" ? "missing_source" : objective.mappingStatus === "review" ? "needs_review" : "mapped";
      return { ...objective, decision, stage, draft: draft ?? null };
    });
    const now = new Date().toISOString();
    const detailsByDocument = new Map(sourceDetails.map((detail) => [detail.documentId, detail]));
    const bookSections = documents.filter((document) => document.category === "Book section").map((document) => ({
      id: document.id,
      subject: document.subject,
      filename: document.filename,
      sourceDetails: detailsByDocument.get(document.id) ?? null,
    }));
    return Response.json({
      objectives,
      bookSections,
      summary: {
        total: objectives.length,
        approved: objectives.filter((item) => item.decision === "approved").length,
        lessonReady: objectives.filter((item) => item.stage === "lesson_ready").length,
        mapped: objectives.filter((item) => item.stage === "mapped").length,
        needsReview: objectives.filter((item) => item.stage === "needs_review").length,
        missingSource: objectives.filter((item) => item.stage === "missing_source").length,
        completedLessons: progress.filter((item) => item.status === "complete").length,
        dueReviews: recall.filter((item) => item.dueAt <= now).length,
      },
    });
  } catch {
    return Response.json({ error: "Syllabus coverage could not be loaded." }, { status: 500 });
  }
}
