import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentExtractions, documentSourceDetails, documentTextChunks, lessonDrafts, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { getLessonSources } from "@/lib/lesson-sources";

const stopWords = new Set(["the", "and", "with", "from", "into", "this", "that", "what", "when", "where", "does", "your", "point", "through"]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function excerpt(text: string, tokens: string[]) {
  const clean = text.replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();
  const first = tokens.map((token) => lower.indexOf(token)).filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, first - 120);
  const end = Math.min(clean.length, first + 500);
  return `${start ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}`;
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const url = new URL(request.url);
    const lessonSlug = url.searchParams.get("lesson")?.trim().slice(0, 120) ?? "";
    const topic = url.searchParams.get("topic")?.trim().slice(0, 240) ?? "";
    if (!lessonSlug || !topic) return Response.json({ error: "lesson and topic are required" }, { status: 400 });
    await ensureVitaeSchema();
    const [reviews, drafts] = await Promise.all([
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
    ]);
    const approved = new Set(reviews.filter((review) => review.decision === "approved").map((review) => review.alignmentId));
    const registryIds = new Set(getLessonSources(lessonSlug).map((source) => source.alignmentId));
    const relevantDrafts = drafts.filter((draft) => approved.has(draft.alignmentId) && (registryIds.has(draft.alignmentId) || draft.lessonSlug === lessonSlug));
    const documentIds = [...new Set(relevantDrafts.map((draft) => draft.sourceDocumentId))];
    if (!documentIds.length) return Response.json({ gate: "source_required", approvedSources: 0, indexedSources: 0, evidence: [], message: "No approved uploaded Book section is linked to this lesson yet." });
    const [documents, details, extractions, chunks] = await Promise.all([
      getDb().select().from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), inArray(studyDocuments.id, documentIds))),
      getDb().select().from(documentSourceDetails).where(and(eq(documentSourceDetails.ownerId, ownerId), inArray(documentSourceDetails.documentId, documentIds))),
      getDb().select().from(documentExtractions).where(and(eq(documentExtractions.ownerId, ownerId), inArray(documentExtractions.documentId, documentIds))),
      getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), inArray(documentTextChunks.documentId, documentIds))),
    ]);
    const documentMap = new Map(documents.map((document) => [document.id, document]));
    const detailMap = new Map(details.map((detail) => [detail.documentId, detail]));
    const extractionMap = new Map(extractions.map((extraction) => [extraction.documentId, extraction]));
    const tokens = normalize(topic).split(" ").filter((token) => token.length > 2 && !stopWords.has(token)).slice(0, 10);
    const evidence = chunks.map((chunk) => {
      const normalized = normalize(chunk.textContent);
      const hits = tokens.filter((token) => normalized.includes(token));
      const phrase = normalize(topic);
      const score = hits.length * 3 + (phrase && normalized.includes(phrase) ? 12 : 0);
      const document = documentMap.get(chunk.documentId);
      const detail = detailMap.get(chunk.documentId);
      const extraction = extractionMap.get(chunk.documentId);
      return { documentId: chunk.documentId, bookTitle: detail?.bookTitle || document?.filename || "Approved source", section: detail?.sectionLabel ?? "", pageNumber: chunk.pageNumber, printedPage: chunk.printedPage, quote: excerpt(chunk.textContent, hits.length ? hits : tokens), method: chunk.method, readerHref: `/reader/${chunk.documentId}?lesson=${encodeURIComponent(lessonSlug)}&page=${chunk.pageNumber}&q=${encodeURIComponent(hits[0] ?? tokens[0] ?? "")}`, score, ocr: extraction?.method.includes("ocr") ?? false };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
    const indexedSources = documentIds.filter((id) => (extractionMap.get(id)?.searchablePages ?? 0) > 0).length;
    return Response.json({ gate: evidence.length ? "supported" : indexedSources ? "passage_not_found" : "index_required", approvedSources: documentIds.length, indexedSources, evidence, message: evidence.length ? "Approved extracted evidence found for this teaching point." : indexedSources ? "The linked source is indexed, but no close passage match was found for this teaching point." : "The approved source is uploaded but still needs a deep index." });
  } catch { return Response.json({ error: "Professor evidence could not be checked." }, { status: 500 }); }
}
