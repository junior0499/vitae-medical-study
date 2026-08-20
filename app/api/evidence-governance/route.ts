import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documentSourceDetails, evidenceFreshnessReviews, learningVersions, objectiveSourceLinks, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { findCoverageObjective } from "@/lib/subject-alignments";

const sourceKinds = new Set(["textbook", "guideline", "lecture", "other"]);
const decisions = new Set(["needs_review", "verified_current", "superseded"]);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value: string) { return !value || datePattern.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()); }

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [documents, details, links, reviews] = await Promise.all([
      getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)).orderBy(desc(studyDocuments.createdAt)),
      getDb().select().from(documentSourceDetails).where(eq(documentSourceDetails.ownerId, ownerId)),
      getDb().select().from(objectiveSourceLinks).where(eq(objectiveSourceLinks.ownerId, ownerId)),
      getDb().select().from(evidenceFreshnessReviews).where(eq(evidenceFreshnessReviews.ownerId, ownerId)),
    ]);
    const detailMap = new Map(details.map((detail) => [detail.documentId, detail]));
    const reviewMap = new Map(reviews.map((review) => [`${review.documentId}:${review.objectiveId}`, review]));
    const today = new Date().toISOString().slice(0, 10);
    const items = documents.flatMap((document) => {
      const documentLinks = links.filter((link) => link.documentId === document.id && link.decision === "approved");
      const scopes = documentLinks.length ? documentLinks.map((link) => link.objectiveId) : [""];
      return scopes.map((objectiveId) => {
        const review = reviewMap.get(`${document.id}:${objectiveId}`);
        const detail = detailMap.get(document.id);
        const decision = review?.decision ?? "needs_review";
        const due = Boolean(review?.reviewDueAt && review.reviewDueAt <= today && decision === "verified_current");
        return {
          documentId: document.id,
          objectiveId,
          objectiveTitle: objectiveId ? findCoverageObjective(objectiveId)?.topic ?? objectiveId : "Document-level evidence",
          filename: document.filename,
          category: document.category,
          bookTitle: detail?.bookTitle ?? "",
          uploadedEdition: detail?.bookEdition ?? "",
          sourceKind: review?.sourceKind ?? (document.category.toLowerCase().includes("guideline") ? "guideline" : "textbook"),
          edition: review?.edition ?? detail?.bookEdition ?? "",
          publicationDate: review?.publicationDate ?? "",
          reviewedAt: review?.reviewedAt ?? "",
          reviewDueAt: review?.reviewDueAt ?? "",
          decision,
          conflictNote: review?.conflictNote ?? "",
          reviewerNote: review?.reviewerNote ?? "",
          updatedAt: review?.updatedAt ?? "",
          due,
          state: due ? "due" : decision,
        };
      });
    });
    return Response.json({
      items,
      summary: { total: items.length, needsReview: items.filter((item) => item.decision === "needs_review").length, current: items.filter((item) => item.decision === "verified_current" && !item.due).length, due: items.filter((item) => item.due).length, superseded: items.filter((item) => item.decision === "superseded").length, conflicts: items.filter((item) => item.conflictNote.trim()).length },
      rule: "Freshness flags never rewrite clinical claims. A person must inspect the source, record the review, and approve any later content change.",
    });
  } catch { return Response.json({ error: "Evidence freshness could not be loaded." }, { status: 500 }); }
}

export async function PUT(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { documentId?: string; objectiveId?: string; sourceKind?: string; edition?: string; publicationDate?: string; reviewedAt?: string; reviewDueAt?: string; decision?: string; conflictNote?: string; reviewerNote?: string };
    const documentId = body.documentId?.trim() ?? "";
    const objectiveId = body.objectiveId?.trim() ?? "";
    const sourceKind = body.sourceKind?.trim() ?? "";
    const decision = body.decision?.trim() ?? "";
    const publicationDate = body.publicationDate?.trim() ?? "";
    const reviewedAt = body.reviewedAt?.trim() ?? "";
    const reviewDueAt = body.reviewDueAt?.trim() ?? "";
    if (!documentId || !sourceKinds.has(sourceKind) || !decisions.has(decision) || ![publicationDate, reviewedAt, reviewDueAt].every(validDate)) return Response.json({ error: "Choose a valid source, decision, and ISO date." }, { status: 400 });
    if (decision === "verified_current" && (!reviewedAt || !reviewDueAt)) return Response.json({ error: "A verified source needs both a review date and next review date." }, { status: 400 });
    await ensureVitaeSchema();
    const document = await getDb().select().from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), eq(studyDocuments.id, documentId))).limit(1).then((rows) => rows[0]);
    if (!document) return Response.json({ error: "This source is not in your private library." }, { status: 404 });
    const now = new Date().toISOString();
    const values = { sourceKind, edition: body.edition?.trim().slice(0, 160) ?? "", publicationDate, reviewedAt, reviewDueAt, decision, conflictNote: body.conflictNote?.trim().slice(0, 3000) ?? "", reviewerNote: body.reviewerNote?.trim().slice(0, 3000) ?? "", updatedAt: now };
    await getDb().insert(evidenceFreshnessReviews).values({ id: crypto.randomUUID(), ownerId, documentId, objectiveId, ...values }).onConflictDoUpdate({ target: [evidenceFreshnessReviews.ownerId, evidenceFreshnessReviews.documentId, evidenceFreshnessReviews.objectiveId], set: values });
    await getDb().insert(learningVersions).values({ id: crypto.randomUUID(), ownerId, entityType: "evidence_freshness", entityKey: `${documentId}:${objectiveId}`, action: decision, summary: `${document.filename} marked ${decision.replaceAll("_", " ")}`, payloadJson: JSON.stringify({ documentId, objectiveId, ...values }), createdAt: now });
    return Response.json({ documentId, objectiveId, ...values, note: "Freshness status saved. No clinical teaching claim was changed automatically." });
  } catch { return Response.json({ error: "The evidence review could not be saved." }, { status: 500 }); }
}

