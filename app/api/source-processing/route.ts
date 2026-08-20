import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { documentTextChunks, sourceProcessingJobs, sourceSearchTerms, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema, getStudyDatabase } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

const stopWords = new Set(["about", "after", "also", "and", "because", "before", "being", "between", "could", "during", "from", "have", "into", "more", "other", "should", "than", "that", "the", "their", "there", "these", "this", "those", "through", "under", "using", "were", "which", "while", "with", "would"]);

function pageTerms(value: string) {
  const counts = new Map<string, number>();
  for (const term of value.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []) {
    if (stopWords.has(term) || term.length > 48) continue;
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 90);
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [jobs, documents] = await Promise.all([
      getDb().select().from(sourceProcessingJobs).where(eq(sourceProcessingJobs.ownerId, ownerId)).orderBy(desc(sourceProcessingJobs.updatedAt)).limit(100),
      getDb().select({ id: studyDocuments.id, filename: studyDocuments.filename, subject: studyDocuments.subject }).from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
    ]);
    const labels = new Map(documents.map((document) => [document.id, document]));
    return Response.json({ jobs: jobs.map((job) => ({ ...job, filename: labels.get(job.documentId)?.filename ?? "Source section", subject: labels.get(job.documentId)?.subject ?? "" })), summary: { queued: jobs.filter((job) => job.status === "queued" || job.status === "processing").length, ready: jobs.filter((job) => job.status === "ready").length } });
  } catch { return Response.json({ error: "The source processing queue could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { documentId?: string };
    const documentId = body.documentId?.trim() ?? "";
    if (!documentId) return Response.json({ error: "Choose a source section to process." }, { status: 400 });
    await ensureVitaeSchema();
    const [document, job] = await Promise.all([
      getDb().select({ id: studyDocuments.id }).from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), eq(studyDocuments.id, documentId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(sourceProcessingJobs).where(and(eq(sourceProcessingJobs.ownerId, ownerId), eq(sourceProcessingJobs.documentId, documentId))).limit(1).then((rows) => rows[0]),
    ]);
    if (!document || !job) return Response.json({ error: "That private processing job could not be found." }, { status: 404 });
    if (job.status === "ready") return Response.json({ job, complete: true });
    const chunks = await getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), eq(documentTextChunks.documentId, documentId), gt(documentTextChunks.pageNumber, job.cursorPage))).orderBy(asc(documentTextChunks.pageNumber)).limit(8);
    if (!chunks.length) {
      const [ready] = await getDb().update(sourceProcessingJobs).set({ status: "ready", processedPages: job.totalPages, updatedAt: new Date().toISOString() }).where(and(eq(sourceProcessingJobs.ownerId, ownerId), eq(sourceProcessingJobs.id, job.id))).returning();
      return Response.json({ job: ready, complete: true });
    }
    const pages = chunks.map((chunk) => chunk.pageNumber);
    await getDb().delete(sourceSearchTerms).where(and(eq(sourceSearchTerms.ownerId, ownerId), eq(sourceSearchTerms.documentId, documentId), inArray(sourceSearchTerms.pageNumber, pages)));
    const terms = chunks.flatMap((chunk) => pageTerms(chunk.textContent).map(([term, frequency]) => ({ id: crypto.randomUUID(), ownerId, documentId, pageNumber: chunk.pageNumber, term, frequency })));
    for (let offset = 0; offset < terms.length; offset += 50) {
      const statements = terms.slice(offset, offset + 50).map((term) => getStudyDatabase().prepare("INSERT OR IGNORE INTO source_search_terms (id, owner_id, document_id, page_number, term, frequency) VALUES (?, ?, ?, ?, ?, ?)").bind(term.id, term.ownerId, term.documentId, term.pageNumber, term.term, term.frequency));
      if (statements.length) await getStudyDatabase().batch(statements);
    }
    const cursorPage = Math.max(...pages); const processedPages = Math.min(job.totalPages, job.processedPages + chunks.length); const complete = processedPages >= job.totalPages;
    const [updated] = await getDb().update(sourceProcessingJobs).set({ status: complete ? "ready" : "processing", processedPages, cursorPage, updatedAt: new Date().toISOString() }).where(and(eq(sourceProcessingJobs.ownerId, ownerId), eq(sourceProcessingJobs.id, job.id))).returning();
    return Response.json({ job: updated, complete, indexedTerms: terms.length });
  } catch { return Response.json({ error: "The next index batch could not be processed." }, { status: 500 }); }
}
