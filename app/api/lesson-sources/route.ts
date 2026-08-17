import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentExtractions, documentSourceDetails, lessonDrafts, studyDocuments } from "@/db/schema";
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
    const [reviews, drafts] = await Promise.all([
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
    ]);
    const decisions = new Map(reviews.map((review) => [review.alignmentId, review.decision]));
    const draftByAlignment = new Map(drafts.map((draft) => [draft.alignmentId, draft]));
    const documentIds = [...new Set(sources.map((source) => draftByAlignment.get(source.alignmentId)?.sourceDocumentId).filter((id): id is string => Boolean(id)))];
    const [documents, details, extractions] = documentIds.length ? await Promise.all([
      getDb().select().from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), inArray(studyDocuments.id, documentIds))),
      getDb().select().from(documentSourceDetails).where(and(eq(documentSourceDetails.ownerId, ownerId), inArray(documentSourceDetails.documentId, documentIds))),
      getDb().select().from(documentExtractions).where(and(eq(documentExtractions.ownerId, ownerId), inArray(documentExtractions.documentId, documentIds))),
    ]) : [[], [], []];
    const documentMap = new Map(documents.map((document) => [document.id, document]));
    const detailMap = new Map(details.map((detail) => [detail.documentId, detail]));
    const extractionMap = new Map(extractions.map((extraction) => [extraction.documentId, extraction]));

    return Response.json({
      lessonSlug,
      sourceMode: "Only approved extracted passages are treated as source evidence. Professor explanations and later-topic connections remain labeled separately.",
      sources: sources.map((source) => {
        const draft = draftByAlignment.get(source.alignmentId);
        const document = draft ? documentMap.get(draft.sourceDocumentId) : null;
        const detail = document ? detailMap.get(document.id) : null;
        const extraction = document ? extractionMap.get(document.id) : null;
        return { ...source, decision: decisions.get(source.alignmentId) ?? "pending", documentId: document?.id ?? null, filename: document?.filename ?? "", uploadedSection: detail?.sectionLabel ?? "", extractionStatus: extraction?.status ?? "missing", searchablePages: extraction?.searchablePages ?? 0, readerHref: document ? `/reader/${document.id}?lesson=${encodeURIComponent(lessonSlug)}` : null };
      }),
    });
  } catch {
    return Response.json({ error: "The lesson source trail could not be loaded." }, { status: 500 });
  }
}
