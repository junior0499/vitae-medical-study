import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentSourceDetails, lessonDrafts, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema, getStudyBucket } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { findCoverageObjective } from "@/lib/subject-alignments";

const searchableTextTypes = new Set(["text/plain", "text/csv"]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function contentSnippet(content: string, query: string) {
  const normalizedContent = content.replace(/\s+/g, " ").trim();
  const index = normalizedContent.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return normalizedContent.slice(0, 240);
  const start = Math.max(0, index - 90);
  const end = Math.min(normalizedContent.length, index + query.length + 150);
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
    const details = approvedDocumentIds.length ? await getDb().select().from(documentSourceDetails).where(inArray(documentSourceDetails.documentId, approvedDocumentIds)) : [];
    const documentMap = new Map(documents.filter((document) => document.category === "Book section").map((document) => [document.id, document]));
    const detailsMap = new Map(details.map((detail) => [detail.documentId, detail]));
    const routeMap = new Map<string, Array<{ alignmentId: string; objective: string; system: string }>>();
    for (const draft of approvedDrafts) {
      const objective = findCoverageObjective(draft.alignmentId);
      const routes = routeMap.get(draft.sourceDocumentId) ?? [];
      routes.push({ alignmentId: draft.alignmentId, objective: objective?.topic ?? draft.title, system: objective?.system ?? draft.system });
      routeMap.set(draft.sourceDocumentId, routes);
    }

    const linkedDocuments = approvedDocumentIds.map((id) => documentMap.get(id)).filter((document): document is NonNullable<typeof document> => Boolean(document));
    const contentMap = new Map<string, string>();
    if (query.length >= 2) {
      const bucket = getStudyBucket();
      const textDocuments = linkedDocuments.filter((document) => searchableTextTypes.has(document.contentType) && document.sizeBytes <= 2 * 1024 * 1024).slice(0, 20);
      await Promise.all(textDocuments.map(async (document) => {
        try { const object = await bucket.get(document.objectKey); if (object) contentMap.set(document.id, await object.text()); } catch { /* Metadata search remains available. */ }
      }));
    }

    const normalizedQuery = normalize(query);
    const tokens = normalizedQuery.split(" ").filter((token) => token.length > 1);
    const results = linkedDocuments.map((document) => {
      const detail = detailsMap.get(document.id);
      const routes = routeMap.get(document.id) ?? [];
      const metadata = [document.filename, document.subject, detail?.bookTitle, detail?.bookEdition, detail?.sectionLabel, detail?.pageRange, ...routes.flatMap((route) => [route.objective, route.system])].filter(Boolean).join(" ");
      const normalizedMetadata = normalize(metadata);
      const content = contentMap.get(document.id) ?? "";
      const normalizedContent = normalize(content);
      const metadataHits = tokens.filter((token) => normalizedMetadata.includes(token)).length;
      const contentHits = tokens.filter((token) => normalizedContent.includes(token)).length;
      const phraseHit = normalizedQuery && (normalizedMetadata.includes(normalizedQuery) || normalizedContent.includes(normalizedQuery));
      const score = (phraseHit ? 12 : 0) + metadataHits * 3 + contentHits * 2;
      const firstPage = detail?.pageRange.match(/\d+/)?.[0];
      const pageFragment = document.contentType === "application/pdf" && firstPage ? `#page=${firstPage}` : "";
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
        matchKind: contentHits ? "approved content + metadata" : "approved metadata",
        snippet: contentHits ? contentSnippet(content, query) : routes.map((route) => route.objective).join(" · "),
        openHref: `/api/documents/${document.id}${pageFragment}`,
        score,
      };
    }).filter((result) => !tokens.length || result.score > 0).sort((a, b) => b.score - a.score || a.bookTitle.localeCompare(b.bookTitle));

    return Response.json({ query, results: results.slice(0, 40), summary: { approvedMappings: approved.size, approvedBookSections: linkedDocuments.length, contentSearchable: linkedDocuments.filter((document) => searchableTextTypes.has(document.contentType)).length }, scope: "Only owner-held Book sections still linked to an approved syllabus mapping are searchable." });
  } catch { return Response.json({ error: "Approved-source search could not be completed." }, { status: 500 }); }
}
