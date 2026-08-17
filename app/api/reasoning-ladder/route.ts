import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, clinicalReasoningProgress, documentExtractions, documentSourceDetails, documentTextChunks, lessonDrafts, objectiveSourceLinks, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { buildReasoningEvidence, reasoningStages } from "@/lib/source-reasoning";
import { coverageObjectives, findCoverageObjective } from "@/lib/subject-alignments";

async function loadReasoningWorkspace(ownerId: string, requestedObjectiveId = "") {
  const [reviews, drafts, documents, details, extractions, sourceLinks, savedProgress] = await Promise.all([
    getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
    getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
    getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
    getDb().select().from(documentSourceDetails).where(eq(documentSourceDetails.ownerId, ownerId)),
    getDb().select().from(documentExtractions).where(eq(documentExtractions.ownerId, ownerId)),
    getDb().select().from(objectiveSourceLinks).where(eq(objectiveSourceLinks.ownerId, ownerId)),
    getDb().select().from(clinicalReasoningProgress).where(eq(clinicalReasoningProgress.ownerId, ownerId)),
  ]);
  const approvedObjectives = new Set(reviews.filter((review) => review.decision === "approved").map((review) => review.alignmentId));
  const draftMap = new Map(drafts.map((draft) => [draft.alignmentId, draft]));
  const documentMap = new Map(documents.filter((document) => document.category === "Book section").map((document) => [document.id, document]));
  const detailMap = new Map(details.map((detail) => [detail.documentId, detail]));
  const extractionMap = new Map(extractions.map((extraction) => [extraction.documentId, extraction]));
  const linksByObjective = new Map<string, typeof sourceLinks>();
  for (const link of sourceLinks.filter((item) => item.decision === "approved")) linksByObjective.set(link.objectiveId, [...(linksByObjective.get(link.objectiveId) ?? []), link]);

  const eligibleObjectives = coverageObjectives.flatMap((objective) => {
    const draft = draftMap.get(objective.id);
    const primary = draft ? documentMap.get(draft.sourceDocumentId) : null;
    const extraction = primary ? extractionMap.get(primary.id) : null;
    if (!approvedObjectives.has(objective.id) || !draft || !primary || !extraction?.searchablePages) return [];
    const supportCount = (linksByObjective.get(objective.id) ?? []).filter((link) => documentMap.has(link.documentId) && (extractionMap.get(link.documentId)?.searchablePages ?? 0) > 0).length;
    const completedStages = savedProgress.filter((item) => item.objectiveId === objective.id && item.status === "complete").length;
    return [{ id: objective.id, topic: objective.topic, subject: objective.subject, system: objective.system, primaryDocumentId: primary.id, supportCount, completedStages }];
  });
  const selectedObjective = requestedObjectiveId ? eligibleObjectives.find((objective) => objective.id === requestedObjectiveId) ?? null : eligibleObjectives[0] ?? null;
  if (!selectedObjective) return { eligibleObjectives, selectedObjective: null, stages: [], sources: [], summary: { complete: 0, ready: 0, gaps: 0 } };

  const primaryDocument = documentMap.get(selectedObjective.primaryDocumentId)!;
  const approvedSupportIds = (linksByObjective.get(selectedObjective.id) ?? []).map((link) => link.documentId).filter((id) => id !== primaryDocument.id && documentMap.has(id) && (extractionMap.get(id)?.searchablePages ?? 0) > 0);
  const sourceIds = [primaryDocument.id, ...new Set(approvedSupportIds)];
  const sources = sourceIds.map((documentId, index) => {
    const document = documentMap.get(documentId)!;
    const detail = detailMap.get(documentId);
    return { documentId, role: index === 0 ? "primary" : "support", label: [detail?.bookTitle || document.filename, detail?.bookEdition, detail?.sectionLabel].filter(Boolean).join(" · ") };
  });
  const chunks = await getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), inArray(documentTextChunks.documentId, sourceIds)));
  const evidenceStages = buildReasoningEvidence(selectedObjective.topic, chunks, sources);
  const progressMap = new Map(savedProgress.filter((item) => item.objectiveId === selectedObjective.id).map((item) => [item.stageKey, item]));
  let priorComplete = true;
  const stages = evidenceStages.map((stage) => {
    const progress = progressMap.get(stage.key);
    const exactEvidenceStillCurrent = Boolean(progress && stage.evidence && progress.documentId === stage.evidence.documentId && progress.pageNumber === stage.evidence.pageNumber && progress.sourceQuote === stage.evidence.quote);
    const complete = progress?.status === "complete" && exactEvidenceStillCurrent;
    const stale = progress?.status === "complete" && !exactEvidenceStillCurrent;
    const state = !stage.evidence ? "gap" : stale ? "stale" : complete ? "complete" : priorComplete ? "ready" : "locked";
    const item = { ...stage, state, noteText: complete ? progress?.noteText ?? "" : "", updatedAt: complete ? progress?.updatedAt ?? "" : "" };
    priorComplete = priorComplete && complete;
    return item;
  });
  return { eligibleObjectives, selectedObjective, stages, sources, summary: { complete: stages.filter((stage) => stage.state === "complete").length, ready: stages.filter((stage) => stage.state === "ready").length, gaps: stages.filter((stage) => stage.state === "gap" || stage.state === "stale").length } };
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const objectiveId = new URL(request.url).searchParams.get("objective")?.trim() ?? "";
    const workspace = await loadReasoningWorkspace(ownerId, objectiveId);
    return Response.json({ ...workspace, safety: "Each stage uses an exact passage from an approved, indexed Book section. A missing passage stays a visible gap." });
  } catch { return Response.json({ error: "The clinical reasoning ladder could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { objectiveId?: string; stageKey?: string; noteText?: string };
    const objectiveId = body.objectiveId?.trim() ?? "";
    const stageKey = body.stageKey?.trim() ?? "";
    const noteText = String(body.noteText ?? "").trim().slice(0, 2000);
    if (!findCoverageObjective(objectiveId) || !reasoningStages.some((stage) => stage.key === stageKey) || noteText.length < 20) return Response.json({ error: "Write at least 20 characters explaining the connection before completing this stage." }, { status: 400 });
    await ensureVitaeSchema();
    const workspace = await loadReasoningWorkspace(ownerId, objectiveId);
    const stage = workspace.stages.find((item) => item.key === stageKey);
    if (!stage || stage.state === "gap" || stage.state === "locked" || !stage.evidence) return Response.json({ error: "This stage is not ready. Complete the earlier stage or attach a matching approved passage first." }, { status: 409 });
    const updatedAt = new Date().toISOString();
    const [progress] = await getDb().insert(clinicalReasoningProgress).values({ id: crypto.randomUUID(), ownerId, objectiveId, stageKey, noteText, status: "complete", documentId: stage.evidence.documentId, pageNumber: stage.evidence.pageNumber, printedPage: stage.evidence.printedPage, sourceQuote: stage.evidence.quote, updatedAt }).onConflictDoUpdate({ target: [clinicalReasoningProgress.ownerId, clinicalReasoningProgress.objectiveId, clinicalReasoningProgress.stageKey], set: { noteText, status: "complete", documentId: stage.evidence.documentId, pageNumber: stage.evidence.pageNumber, printedPage: stage.evidence.printedPage, sourceQuote: stage.evidence.quote, updatedAt } }).returning();
    return Response.json({ progress }, { status: 201 });
  } catch { return Response.json({ error: "The reasoning stage could not be saved." }, { status: 500 }); }
}
