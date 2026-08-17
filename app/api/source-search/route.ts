import { and, eq, inArray, like, or } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentExtractions, documentSourceDetails, documentTextChunks, lessonDrafts, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { findCoverageObjective } from "@/lib/subject-alignments";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function contentSnippet(content: string, query: string) {
  const normalizedContent = content.replace(/\s+/g, " ").trim();
  const index = normalizedContent.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return normalizedContent.slice(0, 280);
  const start = Math.max(0, index - 95);
  const end = Math.min(normalizedContent.length, index + query.length + 165);
  return `${start ? "…" : ""}${normalizedContent.slice(start, end)}${end < normalizedContent.length ? "…" : ""}`;
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 120) ?? "";
    await ensureVitaeSchema();
    const [reviews, drafts, documents] = await Promise.all([
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
      getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
    ]);
    const approved = new Set(reviews.filter((review) => review.decision === "approved").map((review) => review.alignmentId));
    const approvedDrafts = drafts.filter((draft) => approved.has(draft.alignmentId));
    const approvedDocumentIds = [...new Set(approvedDrafts.map((draft) => draft.sourceDocumentId))];
    const documentMap = new Map(documents.filter((document) => document.category === "Book section").map((document) => [document.id, document]));
    const linkedDocuments = approvedDocumentIds.map((id) => documentMap.get(id)).filter((document): document is NonNullable<typeof document> => Boolean(document));
    const linkedIds = linkedDocuments.map((document) => document.id);
    const [details, extractions] = linkedIds.length ? await Promise.all([
      getDb().select().from(documentSourceDetails).where(and(eq(documentSourceDetails.ownerId, ownerId), inArray(documentSourceDetails.documentId, linkedIds))),
      getDb().select().from(documentExtractions).where(and(eq(documentExtractions.ownerId, ownerId), inArray(documentExtractions.documentId, linkedIds))),
    ]) : [[], []];
    const detailsMap = new Map(details.map((detail) => [detail.documentId, detail]));
    const extractionMap = new Map(extractions.map((extraction) => [extraction.documentId, extraction]));
    const routeMap = new Map<string, Array<{ alignmentId: string; objective: string; system: string; lessonSlug: string }>>();
    for (const draft of approvedDrafts) {
      const objective = findCoverageObjective(draft.alignmentId);
      const routes = routeMap.get(draft.sourceDocumentId) ?? [];
      routes.push({ alignmentId: draft.alignmentId, objective: objective?.topic ?? draft.title, system: objective?.system ?? draft.system, lessonSlug: draft.lessonSlug });
      routeMap.set(draft.sourceDocumentId, routes);
    }

    const normalizedQuery = normalize(query);
    const tokens = normalizedQuery.split(" ").filter((token) => token.length > 1).slice(0, 8);
    const chunks = linkedIds.length && tokens.length ? await getDb().select().from(documentTextChunks).where(and(
      eq(documentTextChunks.ownerId, ownerId),
      inArray(documentTextChunks.documentId, linkedIds),
      or(...tokens.map((token) => like(documentTextChunks.textContent, `%${token}%`))),
    )).limit(160) : [];
    const chunksByDocument = new Map<string, typeof chunks>();
    for (const chunk of chunks) chunksByDocument.set(chunk.documentId, [...(chunksByDocument.get(chunk.documentId) ?? []), chunk]);

    const results = linkedDocuments.map((document) => {
      const detail = detailsMap.get(document.id);
      const extraction = extractionMap.get(document.id);
      const routes = routeMap.get(document.id) ?? [];
      const metadata = [document.filename, document.subject, detail?.bookTitle, detail?.bookEdition, detail?.sectionLabel, detail?.pageRange, ...routes.flatMap((route) => [route.objective, route.system])].filter(Boolean).join(" ");
      const normalizedMetadata = normalize(metadata);
      const metadataHits = tokens.filter((token) => normalizedMetadata.includes(token)).length;
      const matchingPages = (chunksByDocument.get(document.id) ?? []).map((chunk) => {
        const normalizedContent = normalize(chunk.textContent);
        const contentHits = tokens.filter((token) => normalizedContent.includes(token)).length;
        const phraseHit = Boolean(normalizedQuery && normalizedContent.includes(normalizedQuery));
        return { pageNumber: chunk.pageNumber, printedPage: chunk.printedPage, snippet: contentSnippet(chunk.textContent, query), score: (phraseHit ? 12 : 0) + contentHits * 3 };
      }).sort((a, b) => b.score - a.score || a.pageNumber - b.pageNumber).slice(0, 5);
      const phraseHit = Boolean(normalizedQuery && normalizedMetadata.includes(normalizedQuery));
      const score = (phraseHit ? 12 : 0) + metadataHits * 3 + (matchingPages[0]?.score ?? 0);
      const bestPage = matchingPages[0];
      const queryString = bestPage ? `?page=${bestPage.pageNumber}&q=${encodeURIComponent(query)}` : "";
      return {
        documentId: document.id,
        filename: document.filename,
        contentType: document.contentType,
        subject: document.subject,
        bookTitle: detail?.bookTitle || document.filename,
        edition: detail?.bookEdition ?? "",
        section: detail?.sectionLabel ?? "",
        pageRange: detail?.pageRange ?? "",
        routes,
        extraction: extraction ? { status: extraction.status, method: extraction.method, searchablePages: extraction.searchablePages, pageCount: extraction.pageCount } : null,
        matchKind: bestPage ? `approved passage${extraction?.method.includes("ocr") ? " · OCR" : ""}` : "approved metadata",
        snippet: bestPage?.snippet || routes.map((route) => route.objective).join(" · "),
        matchPages: matchingPages,
        openHref: extraction?.searchablePages ? `/reader/${document.id}${queryString}` : `/api/documents/${document.id}`,
        originalHref: `/api/documents/${document.id}`,
        score,
      };
    }).filter((result) => !tokens.length || result.score > 0).sort((a, b) => b.score - a.score || a.bookTitle.localeCompare(b.bookTitle));

    const indexed = linkedDocuments.filter((document) => (extractionMap.get(document.id)?.searchablePages ?? 0) > 0);
    return Response.json({
      query,
      results: results.slice(0, 40),
      summary: { approvedMappings: approved.size, approvedBookSections: linkedDocuments.length, contentSearchable: indexed.length, indexedPages: indexed.reduce((sum, document) => sum + (extractionMap.get(document.id)?.searchablePages ?? 0), 0) },
      scope: "Only owner-held Book sections still linked to an approved syllabus mapping are searchable. Extracted text and OCR stay private.",
    });
  } catch { return Response.json({ error: "Approved-source search could not be completed." }, { status: 500 }); }
}
