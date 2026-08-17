import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentExtractions, documentSourceDetails, documentTextChunks, lessonDrafts, lessonNotes, sourceCitations, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { recordLearningVersion } from "@/lib/learning-history";

function normalizeQuote(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  const documentId = new URL(request.url).searchParams.get("document")?.trim() ?? "";
  if (!documentId) return Response.json({ error: "document is required" }, { status: 400 });
  try {
    await ensureVitaeSchema();
    const [document] = await getDb().select({ id: studyDocuments.id, filename: studyDocuments.filename, subject: studyDocuments.subject, category: studyDocuments.category, contentType: studyDocuments.contentType, createdAt: studyDocuments.createdAt }).from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), eq(studyDocuments.id, documentId))).limit(1);
    if (!document) return Response.json({ error: "Source not found." }, { status: 404 });
    const [detail, extraction, chunks, citations, drafts, reviews] = await Promise.all([
      getDb().select().from(documentSourceDetails).where(and(eq(documentSourceDetails.ownerId, ownerId), eq(documentSourceDetails.documentId, documentId))).limit(1).then((rows) => rows[0] ?? null),
      getDb().select().from(documentExtractions).where(and(eq(documentExtractions.ownerId, ownerId), eq(documentExtractions.documentId, documentId))).limit(1).then((rows) => rows[0] ?? null),
      getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), eq(documentTextChunks.documentId, documentId))).orderBy(asc(documentTextChunks.pageNumber)),
      getDb().select().from(sourceCitations).where(and(eq(sourceCitations.ownerId, ownerId), eq(sourceCitations.documentId, documentId))).orderBy(desc(sourceCitations.createdAt)),
      getDb().select().from(lessonDrafts).where(and(eq(lessonDrafts.ownerId, ownerId), eq(lessonDrafts.sourceDocumentId, documentId))),
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
    ]);
    const decisions = new Map(reviews.map((review) => [review.alignmentId, review.decision]));
    const lessonLinks = drafts.map((draft) => ({ lessonSlug: draft.lessonSlug, title: draft.title, alignmentId: draft.alignmentId, decision: decisions.get(draft.alignmentId) ?? "pending" }));
    return Response.json({
      document,
      detail,
      extraction,
      pages: chunks.map((chunk) => ({ pageNumber: chunk.pageNumber, printedPage: chunk.printedPage, text: chunk.textContent, method: chunk.method })),
      citations: citations.map((citation) => ({ id: citation.id, documentId: citation.documentId, lessonSlug: citation.lessonSlug, pageNumber: citation.pageNumber, printedPage: citation.printedPage, quote: citation.quote, noteText: citation.noteText, createdAt: citation.createdAt, updatedAt: citation.updatedAt })),
      lessonLinks,
      approved: lessonLinks.some((lesson) => lesson.decision === "approved"),
    });
  } catch { return Response.json({ error: "The linked source reader could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { documentId?: string; lessonSlug?: string; pageNumber?: number; quote?: string; noteText?: string };
    const documentId = body.documentId?.trim() ?? "";
    const lessonSlug = body.lessonSlug?.trim().slice(0, 120) ?? "";
    const pageNumber = Math.round(Number(body.pageNumber));
    const quote = String(body.quote ?? "").replace(/\s+/g, " ").trim().slice(0, 800);
    const noteText = String(body.noteText ?? "").trim().slice(0, 300);
    if (!documentId || !lessonSlug || !Number.isInteger(pageNumber) || pageNumber < 1 || quote.length < 8) return Response.json({ error: "Highlight a clear passage and choose its lesson." }, { status: 400 });
    await ensureVitaeSchema();
    const [document, chunk, detail, currentNote] = await Promise.all([
      getDb().select().from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), eq(studyDocuments.id, documentId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), eq(documentTextChunks.documentId, documentId), eq(documentTextChunks.pageNumber, pageNumber))).limit(1).then((rows) => rows[0]),
      getDb().select().from(documentSourceDetails).where(and(eq(documentSourceDetails.ownerId, ownerId), eq(documentSourceDetails.documentId, documentId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(lessonNotes).where(and(eq(lessonNotes.ownerId, ownerId), eq(lessonNotes.lessonSlug, lessonSlug))).limit(1).then((rows) => rows[0]),
    ]);
    if (!document || !chunk) return Response.json({ error: "That private indexed page could not be found." }, { status: 404 });
    if (!normalizeQuote(chunk.textContent).includes(normalizeQuote(quote))) return Response.json({ error: "The selected passage no longer matches this indexed page." }, { status: 409 });
    const now = new Date().toISOString();
    const printedPage = chunk.printedPage;
    const pageLabel = printedPage ? `p. ${printedPage}` : `PDF page ${pageNumber}`;
    const sourceLabel = [detail?.bookTitle || document.filename, detail?.sectionLabel, pageLabel].filter(Boolean).join(" · ");
    const citationBlock = `\n\n[Source: ${sourceLabel}]\n“${quote}”${noteText ? `\n${noteText}` : ""}`;
    const content = `${currentNote?.content ?? ""}${citationBlock}`.trim();
    if (content.length > 30_000) return Response.json({ error: "This note is full. Shorten it before attaching another source passage." }, { status: 409 });
    const [citation] = await getDb().insert(sourceCitations).values({ id: crypto.randomUUID(), ownerId, documentId, lessonSlug, pageNumber, printedPage, quote, noteText, createdAt: now, updatedAt: now }).returning();
    const [note] = await getDb().insert(lessonNotes).values({ id: crypto.randomUUID(), ownerId, lessonSlug, content, updatedAt: now }).onConflictDoUpdate({ target: [lessonNotes.ownerId, lessonNotes.lessonSlug], set: { content, updatedAt: now } }).returning();
    await recordLearningVersion({ ownerId, entityType: "note", entityKey: lessonSlug, summary: `Added source citation · ${sourceLabel}`, payload: { lessonSlug, content, updatedAt: now }, createdAt: now });
    return Response.json({ citation: { id: citation.id, documentId: citation.documentId, lessonSlug: citation.lessonSlug, pageNumber: citation.pageNumber, printedPage: citation.printedPage, quote: citation.quote, noteText: citation.noteText, createdAt: citation.createdAt, updatedAt: citation.updatedAt }, note: { lessonSlug: note.lessonSlug, updatedAt: note.updatedAt }, sourceLabel }, { status: 201 });
  } catch { return Response.json({ error: "The highlighted passage could not be attached to your notes." }, { status: 500 }); }
}
