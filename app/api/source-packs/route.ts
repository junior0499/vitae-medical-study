import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentExtractions, documentSourceDetails, documentTextChunks, evidenceFreshnessReviews, lessonDrafts, sourceCitations, sourceLearningPacks, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { recordLearningVersion } from "@/lib/learning-history";
import { coverageObjectives, findCoverageObjective } from "@/lib/subject-alignments";

const decisions = new Set(["pending_review", "approved", "changes_requested"]);

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sourceLabel(document: typeof studyDocuments.$inferSelect, detail: typeof documentSourceDetails.$inferSelect | undefined, pageNumber: number, printedPage: string) {
  const page = printedPage ? `p. ${printedPage}` : `PDF page ${pageNumber}`;
  return [detail?.bookTitle || document.filename, detail?.bookEdition, detail?.sectionLabel, page].filter(Boolean).join(" · ");
}

function publicPack(pack: typeof sourceLearningPacks.$inferSelect) {
  let artifacts: Record<string, unknown> = {};
  try { artifacts = JSON.parse(pack.artifactsJson) as Record<string, unknown>; } catch { /* Keep malformed legacy content visible as empty. */ }
  return { ...pack, artifacts, readerHref: `/reader/${pack.documentId}?page=${pack.pageNumber}` };
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [reviews, drafts, documents, details, extractions, citations, packs] = await Promise.all([
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
      getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
      getDb().select().from(documentSourceDetails).where(eq(documentSourceDetails.ownerId, ownerId)),
      getDb().select().from(documentExtractions).where(eq(documentExtractions.ownerId, ownerId)),
      getDb().select().from(sourceCitations).where(eq(sourceCitations.ownerId, ownerId)),
      getDb().select().from(sourceLearningPacks).where(eq(sourceLearningPacks.ownerId, ownerId)).orderBy(desc(sourceLearningPacks.updatedAt)),
    ]);
    const reviewMap = new Map(reviews.map((item) => [item.alignmentId, item.decision]));
    const draftMap = new Map(drafts.map((item) => [item.alignmentId, item]));
    const documentMap = new Map(documents.map((item) => [item.id, item]));
    const detailMap = new Map(details.map((item) => [item.documentId, item]));
    const extractionMap = new Map(extractions.map((item) => [item.documentId, item]));
    const objectives = coverageObjectives.map((objective) => {
      const draft = draftMap.get(objective.id);
      const document = draft ? documentMap.get(draft.sourceDocumentId) : undefined;
      const extraction = document ? extractionMap.get(document.id) : undefined;
      const gate = reviewMap.get(objective.id) !== "approved" ? "mapping_review_required" : !draft || !document ? "book_section_required" : !extraction?.searchablePages ? "deep_index_required" : "eligible";
      return { id: objective.id, subject: objective.subject, system: objective.system, topic: objective.topic, gate, documentId: document?.id ?? "", sourceName: document ? detailMap.get(document.id)?.bookTitle || document.filename : "", searchablePages: extraction?.searchablePages ?? 0 };
    });
    const requestedObjective = new URL(request.url).searchParams.get("objectiveId")?.trim() ?? "";
    const selected = objectives.find((item) => item.id === requestedObjective && item.gate === "eligible");
    let candidates: Array<{ documentId: string; pageNumber: number; printedPage: string; quote: string; sourceLabel: string; readerHref: string; savedCitation: boolean }> = [];
    if (selected) {
      const chunks = await getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), eq(documentTextChunks.documentId, selected.documentId)));
      const document = documentMap.get(selected.documentId)!;
      const detail = detailMap.get(selected.documentId);
      const saved = citations.filter((item) => item.documentId === selected.documentId);
      const savedCandidates = saved.map((item) => ({ documentId: item.documentId, pageNumber: item.pageNumber, printedPage: item.printedPage, quote: normalize(item.quote).slice(0, 1600), sourceLabel: sourceLabel(document, detail, item.pageNumber, item.printedPage), readerHref: `/reader/${item.documentId}?page=${item.pageNumber}`, savedCitation: true }));
      const indexedCandidates = chunks.map((item) => ({ documentId: item.documentId, pageNumber: item.pageNumber, printedPage: item.printedPage, quote: normalize(item.textContent).slice(0, 900), sourceLabel: sourceLabel(document, detail, item.pageNumber, item.printedPage), readerHref: `/reader/${item.documentId}?page=${item.pageNumber}`, savedCitation: false }));
      candidates = [...savedCandidates, ...indexedCandidates].filter((item, index, all) => item.quote.length >= 40 && all.findIndex((candidate) => candidate.documentId === item.documentId && candidate.pageNumber === item.pageNumber && candidate.quote === item.quote) === index).slice(0, 30);
    }
    return Response.json({ objectives, candidates, packs: packs.map(publicPack), summary: { packs: packs.length, approved: packs.filter((item) => item.status === "approved").length, eligibleObjectives: objectives.filter((item) => item.gate === "eligible").length, blockedObjectives: objectives.filter((item) => item.gate !== "eligible").length } });
  } catch {
    return Response.json({ error: "Source learning packs could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { objectiveId?: string; pageNumber?: number; sourceQuote?: string; title?: string };
    const objectiveId = body.objectiveId?.trim() ?? "";
    const objective = findCoverageObjective(objectiveId);
    const pageNumber = Math.round(Number(body.pageNumber));
    const quote = normalize(body.sourceQuote ?? "").slice(0, 1600);
    const title = normalize(body.title || objective?.topic || "").slice(0, 240);
    if (!objective || !Number.isInteger(pageNumber) || pageNumber < 1 || quote.length < 40 || !title) return Response.json({ error: "Choose an eligible objective and one exact source passage." }, { status: 400 });
    await ensureVitaeSchema();
    const [review, draft] = await Promise.all([
      getDb().select().from(alignmentReviews).where(and(eq(alignmentReviews.ownerId, ownerId), eq(alignmentReviews.alignmentId, objectiveId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(lessonDrafts).where(and(eq(lessonDrafts.ownerId, ownerId), eq(lessonDrafts.alignmentId, objectiveId))).limit(1).then((rows) => rows[0]),
    ]);
    if (review?.decision !== "approved") return Response.json({ error: "Approve this objective’s source mapping first.", code: "mapping_review_required" }, { status: 409 });
    if (!draft) return Response.json({ error: "Attach an uploaded Book section and create its lesson draft first.", code: "book_section_required" }, { status: 409 });
    const [document, detail, chunk, freshness] = await Promise.all([
      getDb().select().from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), eq(studyDocuments.id, draft.sourceDocumentId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(documentSourceDetails).where(and(eq(documentSourceDetails.ownerId, ownerId), eq(documentSourceDetails.documentId, draft.sourceDocumentId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), eq(documentTextChunks.documentId, draft.sourceDocumentId), eq(documentTextChunks.pageNumber, pageNumber))).limit(1).then((rows) => rows[0]),
      getDb().select().from(evidenceFreshnessReviews).where(eq(evidenceFreshnessReviews.ownerId, ownerId)),
    ]);
    if (!document || !chunk || !normalize(chunk.textContent).includes(quote)) return Response.json({ error: "The selected passage no longer matches the indexed source page.", code: "source_quote_changed" }, { status: 409 });
    const freshnessReview = freshness.find((item) => item.documentId === document.id && item.objectiveId === objectiveId) ?? freshness.find((item) => item.documentId === document.id && !item.objectiveId);
    const today = new Date().toISOString().slice(0, 10);
    if (freshnessReview?.decision === "superseded" || freshnessReview?.decision === "verified_current" && freshnessReview.reviewDueAt && freshnessReview.reviewDueAt <= today) return Response.json({ error: "Review this source’s freshness before creating a learning pack.", code: "freshness_review_required" }, { status: 409 });
    const now = new Date().toISOString();
    const label = sourceLabel(document, detail, pageNumber, chunk.printedPage);
    const artifacts = {
      lesson: { state: "prepared", href: `/reader/${document.id}?page=${pageNumber}`, label: draft.title },
      recall: { state: "scaffold", instruction: "Write a retrieval prompt only after the passage meaning is reviewed." },
      clinicalCase: { state: "source_locked", instruction: "Add patient findings only from an approved clinical source." },
      viva: { state: "scaffold", instruction: "Ask for a source-backed explanation, not verbatim recall." },
      visibleGaps: ["Illness-script fields require section-by-section human review", "Disease findings and management stay locked unless this passage supports them"],
    };
    const values = { title, sourceLabel: label, sourceQuote: quote, printedPage: chunk.printedPage, artifactsJson: JSON.stringify(artifacts), status: "pending_review", reviewerNote: "", updatedAt: now };
    const [pack] = await getDb().insert(sourceLearningPacks).values({ id: crypto.randomUUID(), ownerId, objectiveId, documentId: document.id, pageNumber, ...values, createdAt: now }).onConflictDoUpdate({ target: [sourceLearningPacks.ownerId, sourceLearningPacks.objectiveId, sourceLearningPacks.documentId, sourceLearningPacks.pageNumber], set: values }).returning();
    await recordLearningVersion({ ownerId, entityType: "source_pack", entityKey: pack.id, summary: `${title} · pending source review`, payload: publicPack(pack), createdAt: now });
    return Response.json({ pack: publicPack(pack), reviewGate: "pending_review" }, { status: 201 });
  } catch {
    return Response.json({ error: "The source learning pack could not be prepared." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { id?: string; status?: string; reviewerNote?: string };
    const id = body.id?.trim() ?? "";
    const status = body.status?.trim() ?? "";
    const reviewerNote = normalize(body.reviewerNote ?? "").slice(0, 2000);
    if (!id || !decisions.has(status)) return Response.json({ error: "Choose a valid source pack and review decision." }, { status: 400 });
    await ensureVitaeSchema();
    const [pack] = await getDb().select().from(sourceLearningPacks).where(and(eq(sourceLearningPacks.ownerId, ownerId), eq(sourceLearningPacks.id, id))).limit(1);
    if (!pack) return Response.json({ error: "Source learning pack not found." }, { status: 404 });
    if (status === "approved") {
      const [review, chunk] = await Promise.all([
        getDb().select().from(alignmentReviews).where(and(eq(alignmentReviews.ownerId, ownerId), eq(alignmentReviews.alignmentId, pack.objectiveId))).limit(1).then((rows) => rows[0]),
        getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), eq(documentTextChunks.documentId, pack.documentId), eq(documentTextChunks.pageNumber, pack.pageNumber))).limit(1).then((rows) => rows[0]),
      ]);
      if (review?.decision !== "approved" || !chunk || !normalize(chunk.textContent).includes(normalize(pack.sourceQuote))) return Response.json({ error: "The approved mapping or exact passage changed. Rebuild this pack before approval." }, { status: 409 });
    }
    const updatedAt = new Date().toISOString();
    const [saved] = await getDb().update(sourceLearningPacks).set({ status, reviewerNote, updatedAt }).where(and(eq(sourceLearningPacks.ownerId, ownerId), eq(sourceLearningPacks.id, id))).returning();
    await recordLearningVersion({ ownerId, entityType: "source_pack", entityKey: id, summary: `${saved.title} · ${status}`, payload: publicPack(saved), createdAt: updatedAt });
    return Response.json({ pack: publicPack(saved) });
  } catch {
    return Response.json({ error: "The source pack review could not be saved." }, { status: 500 });
  }
}
