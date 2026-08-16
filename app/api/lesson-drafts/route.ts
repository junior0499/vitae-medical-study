import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentSourceDetails, lessonDrafts, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { findCoverageObjective } from "@/lib/subject-alignments";
import { recordLearningVersion } from "@/lib/learning-history";

function subjectMatches(documentSubject: string, objectiveSubject: string) {
  const normalizedDocument = documentSubject.toLowerCase().replace(/\bi\b/g, "").replace(/[^a-z&]+/g, " ").trim();
  const normalizedObjective = objectiveSubject.toLowerCase().replace(/\bi\b/g, "").replace(/[^a-z&]+/g, " ").trim();
  return normalizedDocument.includes(normalizedObjective) || normalizedObjective.includes(normalizedDocument);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const drafts = await getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)).orderBy(desc(lessonDrafts.updatedAt));
    return Response.json({ drafts });
  } catch {
    return Response.json({ error: "Lesson drafts could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { alignmentId?: string; sourceDocumentId?: string };
    const alignmentId = body.alignmentId?.trim() ?? "";
    const objective = findCoverageObjective(alignmentId);
    if (!objective) return Response.json({ error: "Choose a known syllabus objective." }, { status: 404 });
    await ensureVitaeSchema();

    const [review] = await getDb().select().from(alignmentReviews).where(and(
      eq(alignmentReviews.ownerId, ownerId), eq(alignmentReviews.alignmentId, alignmentId),
    )).limit(1);
    if (review?.decision !== "approved") {
      return Response.json({ error: "Approve the source mapping before creating a lesson draft.", code: "approval_required" }, { status: 409 });
    }

    const documents = await getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)).orderBy(desc(studyDocuments.createdAt));
    const matchingDocuments = documents.filter((document) => document.category === "Book section" && subjectMatches(document.subject, objective.subject));
    const requestedSourceId = body.sourceDocumentId?.trim() ?? "";
    const sourceDocument = requestedSourceId
      ? matchingDocuments.find((document) => document.id === requestedSourceId)
      : matchingDocuments[0];
    if (!sourceDocument) {
      return Response.json({ error: requestedSourceId ? "Choose a Book section that belongs to this subject." : `Upload a Book section for ${objective.subject} before creating this source-locked draft.`, code: "source_required" }, { status: 409 });
    }
    const [details] = await getDb().select().from(documentSourceDetails).where(and(
      eq(documentSourceDetails.ownerId, ownerId), eq(documentSourceDetails.documentId, sourceDocument.id),
    )).limit(1);
    const sourceLabel = details?.bookTitle
      ? `${details.bookTitle}${details.bookEdition ? ` · ${details.bookEdition}` : ""}${details.sectionLabel ? ` · ${details.sectionLabel}` : ""}${details.pageRange ? ` · pp. ${details.pageRange}` : ""}`
      : sourceDocument.filename;
    const outline = {
      objective: objective.topic,
      sourceLock: sourceLabel,
      sourceDocumentId: sourceDocument.id,
      sections: [
        { label: "Prerequisites", instruction: "List only foundations needed to understand this objective." },
        { label: "From the uploaded section", instruction: "Extract the core sequence after the source text is reviewed." },
        { label: "Professor explanation", instruction: "Explain difficult connections without presenting them as source quotations." },
        { label: "Clinical connection", instruction: "Connect the objective to recognition, examination, or a later clinical block." },
        { label: "Recall and correction", instruction: "Add recall questions, staged hints, and a correction note." },
        { label: "Sideways mind map", instruction: "Arrange prerequisite → mechanism → finding → clinical use." },
      ],
      reviewGate: "Draft outline only. Source extraction and human review are required before publication as a lesson.",
    };
    const now = new Date().toISOString();
    const lessonSlug = `${alignmentId}-${slugify(objective.topic)}`;
    const values = {
      sourceDocumentId: sourceDocument.id, lessonSlug, subject: objective.subject, system: objective.system,
      title: objective.topic, status: "draft", outlineJson: JSON.stringify(outline), updatedAt: now,
    };
    const [draft] = await getDb().insert(lessonDrafts).values({
      id: crypto.randomUUID(), ownerId, alignmentId, ...values, createdAt: now,
    }).onConflictDoUpdate({
      target: [lessonDrafts.ownerId, lessonDrafts.alignmentId], set: values,
    }).returning();
    await recordLearningVersion({ ownerId, entityType: "lesson_draft", entityKey: alignmentId, summary: `${objective.topic} · ${sourceLabel}`, payload: { alignmentId, sourceDocumentId: sourceDocument.id, lessonSlug, subject: objective.subject, system: objective.system, title: objective.topic, status: "draft", outlineJson: values.outlineJson, createdAt: draft.createdAt, updatedAt: now }, createdAt: now });
    return Response.json({ draft, outline }, { status: 201 });
  } catch {
    return Response.json({ error: "The source-locked lesson draft could not be created." }, { status: 500 });
  }
}
