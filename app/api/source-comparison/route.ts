import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentExtractions, documentSourceDetails, documentTextChunks, lessonDrafts, objectiveSourceLinks, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { compareApprovedSources } from "@/lib/source-reasoning";
import { coverageObjectives, findCoverageObjective } from "@/lib/subject-alignments";

const decisions = new Set(["pending_review", "approved", "changes_requested"]);

async function loadSourceWorkspace(ownerId: string) {
  const [reviews, drafts, documents, details, extractions, links] = await Promise.all([
    getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
    getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
    getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
    getDb().select().from(documentSourceDetails).where(eq(documentSourceDetails.ownerId, ownerId)),
    getDb().select().from(documentExtractions).where(eq(documentExtractions.ownerId, ownerId)),
    getDb().select().from(objectiveSourceLinks).where(eq(objectiveSourceLinks.ownerId, ownerId)),
  ]);
  const approvedObjectives = new Set(reviews.filter((review) => review.decision === "approved").map((review) => review.alignmentId));
  const draftMap = new Map(drafts.map((draft) => [draft.alignmentId, draft]));
  const documentMap = new Map(documents.filter((document) => document.category === "Book section").map((document) => [document.id, document]));
  const detailMap = new Map(details.map((detail) => [detail.documentId, detail]));
  const extractionMap = new Map(extractions.map((extraction) => [extraction.documentId, extraction]));
  const publicDocument = (documentId: string) => {
    const document = documentMap.get(documentId);
    const detail = detailMap.get(documentId);
    const extraction = extractionMap.get(documentId);
    if (!document || !extraction?.searchablePages) return null;
    return { documentId, label: [detail?.bookTitle || document.filename, detail?.bookEdition, detail?.sectionLabel].filter(Boolean).join(" · "), filename: document.filename, subject: document.subject, pageRange: detail?.pageRange ?? "", searchablePages: extraction.searchablePages };
  };
  const eligibleObjectives = coverageObjectives.flatMap((objective) => {
    const draft = draftMap.get(objective.id);
    const primary = draft ? publicDocument(draft.sourceDocumentId) : null;
    if (!approvedObjectives.has(objective.id) || !draft || !primary) return [];
    return [{ id: objective.id, topic: objective.topic, subject: objective.subject, system: objective.system, primary }];
  });
  const availableSources = [...documentMap.keys()].map(publicDocument).filter((document): document is NonNullable<typeof document> => Boolean(document));
  return { reviews, draftMap, documentMap, extractionMap, links, eligibleObjectives, availableSources, publicDocument, approvedObjectives };
}

function publicLink(link: typeof objectiveSourceLinks.$inferSelect, document: ReturnType<Awaited<ReturnType<typeof loadSourceWorkspace>>["publicDocument"]>) {
  return { id: link.id, objectiveId: link.objectiveId, documentId: link.documentId, role: link.role, decision: link.decision, reviewerNote: link.reviewerNote, createdAt: link.createdAt, updatedAt: link.updatedAt, document };
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const url = new URL(request.url);
    const requestedObjectiveId = url.searchParams.get("objective")?.trim() ?? "";
    const leftId = url.searchParams.get("left")?.trim() ?? "";
    const rightId = url.searchParams.get("right")?.trim() ?? "";
    const workspace = await loadSourceWorkspace(ownerId);
    const selectedObjective = requestedObjectiveId ? workspace.eligibleObjectives.find((objective) => objective.id === requestedObjectiveId) ?? null : workspace.eligibleObjectives[0] ?? null;
    const selectedLinks = selectedObjective ? workspace.links.filter((link) => link.objectiveId === selectedObjective.id).map((link) => publicLink(link, workspace.publicDocument(link.documentId))).filter((link) => link.document) : [];
    const approvedSources = selectedObjective ? [
      { ...selectedObjective.primary, role: "primary", decision: "approved" },
      ...selectedLinks.filter((link) => link.decision === "approved" && link.document).map((link) => ({ ...link.document!, role: link.role, decision: link.decision })),
    ].filter((source, index, all) => all.findIndex((item) => item.documentId === source.documentId) === index) : [];
    let comparison = null;
    if (selectedObjective && leftId && rightId && leftId !== rightId) {
      const approvedIds = new Set(approvedSources.map((source) => source.documentId));
      if (!approvedIds.has(leftId) || !approvedIds.has(rightId)) return Response.json({ error: "Both books must be approved for this objective before comparison." }, { status: 409 });
      const chunks = await getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), inArray(documentTextChunks.documentId, [leftId, rightId])));
      const leftSource = approvedSources.find((source) => source.documentId === leftId)!;
      const rightSource = approvedSources.find((source) => source.documentId === rightId)!;
      comparison = compareApprovedSources(selectedObjective.topic, chunks.filter((chunk) => chunk.documentId === leftId), chunks.filter((chunk) => chunk.documentId === rightId), leftSource, rightSource);
    }
    const attachedIds = new Set([selectedObjective?.primary.documentId, ...selectedLinks.map((link) => link.documentId)].filter(Boolean));
    return Response.json({
      eligibleObjectives: workspace.eligibleObjectives,
      selectedObjective,
      sourceLinks: selectedLinks,
      approvedSources,
      availableSources: workspace.availableSources.filter((source) => !attachedIds.has(source.documentId)),
      comparison,
      safety: "Flags identify possible wording, direction, negation, or numerical differences. They are review prompts, never automatic declarations that a book is wrong.",
    });
  } catch { return Response.json({ error: "Approved-book comparison could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { objectiveId?: string; documentId?: string };
    const objectiveId = String(body.objectiveId ?? "").trim();
    const documentId = String(body.documentId ?? "").trim();
    if (!findCoverageObjective(objectiveId) || !documentId) return Response.json({ error: "Choose an eligible objective and indexed Book section." }, { status: 400 });
    await ensureVitaeSchema();
    const workspace = await loadSourceWorkspace(ownerId);
    const objective = workspace.eligibleObjectives.find((item) => item.id === objectiveId);
    const document = workspace.publicDocument(documentId);
    if (!objective || !document) return Response.json({ error: "Approve the objective’s primary mapping and build the support section’s deep index first." }, { status: 409 });
    if (objective.primary.documentId === documentId) return Response.json({ error: "This is already the approved primary source." }, { status: 409 });
    const now = new Date().toISOString();
    const [link] = await getDb().insert(objectiveSourceLinks).values({ id: crypto.randomUUID(), ownerId, objectiveId, documentId, role: "support", decision: "pending_review", reviewerNote: "", createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: [objectiveSourceLinks.ownerId, objectiveSourceLinks.objectiveId, objectiveSourceLinks.documentId], set: { decision: "pending_review", reviewerNote: "", updatedAt: now } }).returning();
    return Response.json({ link: publicLink(link, document) }, { status: 201 });
  } catch { return Response.json({ error: "The support source could not be attached." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { id?: string; decision?: string; reviewerNote?: string };
    const id = String(body.id ?? "").trim();
    const decision = String(body.decision ?? "").trim();
    const reviewerNote = String(body.reviewerNote ?? "").trim().slice(0, 1000);
    if (!id || !decisions.has(decision)) return Response.json({ error: "Choose a valid support source and review decision." }, { status: 400 });
    await ensureVitaeSchema();
    const [existing] = await getDb().select().from(objectiveSourceLinks).where(and(eq(objectiveSourceLinks.ownerId, ownerId), eq(objectiveSourceLinks.id, id))).limit(1);
    if (!existing) return Response.json({ error: "Support source not found." }, { status: 404 });
    if (decision === "approved") {
      const workspace = await loadSourceWorkspace(ownerId);
      if (!workspace.approvedObjectives.has(existing.objectiveId) || !workspace.publicDocument(existing.documentId)) return Response.json({ error: "The objective mapping or deep source index changed. Review it before approval." }, { status: 409 });
    }
    const [link] = await getDb().update(objectiveSourceLinks).set({ decision, reviewerNote, updatedAt: new Date().toISOString() }).where(and(eq(objectiveSourceLinks.ownerId, ownerId), eq(objectiveSourceLinks.id, id))).returning();
    return Response.json({ link });
  } catch { return Response.json({ error: "The support source review could not be saved." }, { status: 500 }); }
}
