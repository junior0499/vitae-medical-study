import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documentExtractions, documentSourceDetails, documentTextChunks, sourceProcessingJobs, sourceSearchCache, sourceSearchTerms, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

const allowedStatuses = new Set(["ready", "partial", "needs_ocr", "failed"]);
const allowedMethods = new Set(["plain_text", "docx_text", "pdf_text", "pdf_text+ocr", "unsupported"]);
const MAX_PAGES = 80;
const MAX_PAGE_CHARACTERS = 15_000;
const MAX_TOTAL_CHARACTERS = 500_000;

function printedPageFor(pageRange: string, pageNumber: number) {
  const first = pageRange.match(/\d+/)?.[0];
  return first ? String(Number(first) + pageNumber - 1) : "";
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  const documentId = new URL(request.url).searchParams.get("document")?.trim() ?? "";
  if (!documentId) return Response.json({ error: "document is required" }, { status: 400 });
  try {
    await ensureVitaeSchema();
    const [document] = await getDb().select({ id: studyDocuments.id }).from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), eq(studyDocuments.id, documentId))).limit(1);
    if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
    const [extraction] = await getDb().select().from(documentExtractions).where(and(eq(documentExtractions.ownerId, ownerId), eq(documentExtractions.documentId, documentId))).limit(1);
    return Response.json({ extraction: extraction ?? null });
  } catch { return Response.json({ error: "The source index could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { documentId?: string; status?: string; method?: string; pageCount?: number; pages?: Array<{ pageNumber?: number; text?: string }>; warning?: string };
    const documentId = body.documentId?.trim() ?? "";
    const status = body.status?.trim() ?? "failed";
    const method = body.method?.trim() ?? "unsupported";
    if (!documentId || !allowedStatuses.has(status) || !allowedMethods.has(method) || !Array.isArray(body.pages)) {
      return Response.json({ error: "The extracted source payload is invalid." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const [document] = await getDb().select().from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), eq(studyDocuments.id, documentId))).limit(1);
    if (!document) return Response.json({ error: "Document not found." }, { status: 404 });
    const [detail, existing] = await Promise.all([
      getDb().select().from(documentSourceDetails).where(and(eq(documentSourceDetails.ownerId, ownerId), eq(documentSourceDetails.documentId, documentId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(documentExtractions).where(and(eq(documentExtractions.ownerId, ownerId), eq(documentExtractions.documentId, documentId))).limit(1).then((rows) => rows[0]),
    ]);

    const seen = new Set<number>();
    let usedCharacters = 0;
    const pages = body.pages.slice(0, MAX_PAGES).flatMap((page) => {
      const pageNumber = Math.round(Number(page.pageNumber));
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 5000 || seen.has(pageNumber) || usedCharacters >= MAX_TOTAL_CHARACTERS) return [];
      const textContent = String(page.text ?? "").split("\u0000").join("").trim().slice(0, Math.min(MAX_PAGE_CHARACTERS, MAX_TOTAL_CHARACTERS - usedCharacters));
      if (textContent.length < 12) return [];
      seen.add(pageNumber); usedCharacters += textContent.length;
      return [{ id: crypto.randomUUID(), ownerId, documentId, pageNumber, printedPage: printedPageFor(detail?.pageRange ?? "", pageNumber), textContent, method, createdAt: new Date().toISOString() }];
    });
    const now = new Date().toISOString();
    await getDb().delete(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), eq(documentTextChunks.documentId, documentId)));
    await getDb().delete(sourceSearchTerms).where(and(eq(sourceSearchTerms.ownerId, ownerId), eq(sourceSearchTerms.documentId, documentId)));
    await getDb().delete(sourceSearchCache).where(eq(sourceSearchCache.ownerId, ownerId));
    if (pages.length) await getDb().insert(documentTextChunks).values(pages);
    const pageCount = Math.max(0, Math.min(5000, Math.round(Number(body.pageCount) || pages.length)));
    const values = { status: status === "ready" && !pages.length ? "failed" : status, method, pageCount, searchablePages: pages.length, characterCount: usedCharacters, warning: String(body.warning ?? "").slice(0, 500), updatedAt: now };
    const [extraction] = await getDb().insert(documentExtractions).values({ id: crypto.randomUUID(), ownerId, documentId, ...values, createdAt: existing?.createdAt ?? now }).onConflictDoUpdate({ target: [documentExtractions.ownerId, documentExtractions.documentId], set: values }).returning();
    const [processingJob] = await getDb().insert(sourceProcessingJobs).values({ id: crypto.randomUUID(), ownerId, documentId, status: pages.length ? "queued" : "ready", totalPages: pages.length, processedPages: 0, cursorPage: 0, warning: values.warning, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: [sourceProcessingJobs.ownerId, sourceProcessingJobs.documentId], set: { status: pages.length ? "queued" : "ready", totalPages: pages.length, processedPages: 0, cursorPage: 0, warning: values.warning, updatedAt: now } }).returning();
    return Response.json({ extraction, processingJob }, { status: 201 });
  } catch { return Response.json({ error: "The deep source index could not be saved." }, { status: 500 }); }
}
