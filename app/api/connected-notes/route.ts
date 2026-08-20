import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { generatedQuestions, learningEvidenceLinks, lessonNotes, mistakeNotebook, noteMindMaps, sourceCitations } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { coverageObjectives, findCoverageObjective } from "@/lib/subject-alignments";

const entityTypes = new Set(["note", "mind_map_node"]);
const linkTypes = new Set(["objective", "source", "question", "mistake"]);

function mapNodes(nodesJson: string) {
  try {
    const nodes = JSON.parse(nodesJson) as Array<{ label?: unknown; detail?: unknown }>;
    return Array.isArray(nodes) ? nodes.slice(0, 12).map((node) => ({ label: String(node.label ?? ""), detail: String(node.detail ?? "") })) : [];
  } catch { return []; }
}

async function entityExists(ownerId: string, entityType: string, entityKey: string) {
  if (entityType === "note") {
    const [note] = await getDb().select({ id: lessonNotes.id }).from(lessonNotes).where(and(eq(lessonNotes.ownerId, ownerId), eq(lessonNotes.lessonSlug, entityKey))).limit(1);
    return Boolean(note);
  }
  const separator = entityKey.lastIndexOf(":");
  const lessonSlug = separator > 0 ? entityKey.slice(0, separator) : "";
  const nodeIndex = Number(entityKey.slice(separator + 1));
  if (!lessonSlug || !Number.isInteger(nodeIndex) || nodeIndex < 0) return false;
  const [map] = await getDb().select({ nodesJson: noteMindMaps.nodesJson }).from(noteMindMaps).where(and(eq(noteMindMaps.ownerId, ownerId), eq(noteMindMaps.lessonSlug, lessonSlug))).limit(1);
  return Boolean(map && mapNodes(map.nodesJson)[nodeIndex]);
}

async function targetExists(ownerId: string, linkType: string, targetId: string) {
  if (linkType === "objective") return Boolean(findCoverageObjective(targetId));
  if (linkType === "source") {
    const [row] = await getDb().select({ id: sourceCitations.id }).from(sourceCitations).where(and(eq(sourceCitations.ownerId, ownerId), eq(sourceCitations.id, targetId))).limit(1);
    return Boolean(row);
  }
  if (linkType === "question") {
    const [row] = await getDb().select({ id: generatedQuestions.id, status: generatedQuestions.status }).from(generatedQuestions).where(and(eq(generatedQuestions.ownerId, ownerId), eq(generatedQuestions.id, targetId))).limit(1);
    return row?.status === "approved";
  }
  const [row] = await getDb().select({ id: mistakeNotebook.id }).from(mistakeNotebook).where(and(eq(mistakeNotebook.ownerId, ownerId), eq(mistakeNotebook.id, targetId))).limit(1);
  return Boolean(row);
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [notes, maps, citations, questions, mistakes, links] = await Promise.all([
      getDb().select().from(lessonNotes).where(eq(lessonNotes.ownerId, ownerId)).orderBy(desc(lessonNotes.updatedAt)).limit(100),
      getDb().select().from(noteMindMaps).where(eq(noteMindMaps.ownerId, ownerId)).orderBy(desc(noteMindMaps.updatedAt)).limit(100),
      getDb().select().from(sourceCitations).where(eq(sourceCitations.ownerId, ownerId)).orderBy(desc(sourceCitations.updatedAt)).limit(250),
      getDb().select().from(generatedQuestions).where(and(eq(generatedQuestions.ownerId, ownerId), eq(generatedQuestions.status, "approved"))).orderBy(desc(generatedQuestions.updatedAt)).limit(250),
      getDb().select().from(mistakeNotebook).where(eq(mistakeNotebook.ownerId, ownerId)).orderBy(desc(mistakeNotebook.updatedAt)).limit(250),
      getDb().select().from(learningEvidenceLinks).where(eq(learningEvidenceLinks.ownerId, ownerId)).orderBy(desc(learningEvidenceLinks.createdAt)).limit(1000),
    ]);
    return Response.json({
      entities: [
        ...notes.map((note) => ({ entityType: "note", entityKey: note.lessonSlug, lessonSlug: note.lessonSlug, title: note.lessonSlug.replaceAll("-", " "), detail: note.content.trim().replace(/\s+/g, " ").slice(0, 220), updatedAt: note.updatedAt })),
        ...maps.flatMap((map) => mapNodes(map.nodesJson).map((node, index) => ({ entityType: "mind_map_node", entityKey: `${map.lessonSlug}:${index}`, lessonSlug: map.lessonSlug, title: node.label, detail: node.detail, updatedAt: map.updatedAt }))),
      ],
      targets: {
        objectives: coverageObjectives.map((objective) => ({ id: objective.id, label: objective.topic, meta: `${objective.subject} · ${objective.system}` })),
        sources: citations.map((citation) => ({ id: citation.id, label: citation.quote.slice(0, 150), meta: `${citation.lessonSlug} · ${citation.printedPage ? `p. ${citation.printedPage}` : `PDF page ${citation.pageNumber}`}`, href: `/reader/${citation.documentId}?page=${citation.pageNumber}` })),
        questions: questions.map((question) => ({ id: question.id, label: question.prompt, meta: `${question.questionType.replaceAll("_", " ")} · ${question.objectiveId}` })),
        mistakes: mistakes.map((mistake) => ({ id: mistake.id, label: mistake.prompt, meta: `${mistake.subject} · ${mistake.status}` })),
      },
      links,
      rule: "Source links use exact saved citations; question links accept only individually approved questions.",
    });
  } catch { return Response.json({ error: "The connected note workspace could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { entityType?: string; entityKey?: string; linkType?: string; targetId?: string };
    const entityType = body.entityType?.trim() ?? "";
    const entityKey = body.entityKey?.trim().slice(0, 180) ?? "";
    const linkType = body.linkType?.trim() ?? "";
    const targetId = body.targetId?.trim().slice(0, 180) ?? "";
    if (!entityTypes.has(entityType) || !linkTypes.has(linkType) || !entityKey || !targetId) return Response.json({ error: "Choose a valid note point and learning connection." }, { status: 400 });
    await ensureVitaeSchema();
    if (!(await entityExists(ownerId, entityType, entityKey))) return Response.json({ error: "That private note point no longer exists." }, { status: 404 });
    if (!(await targetExists(ownerId, linkType, targetId))) return Response.json({ error: linkType === "question" ? "Only an individually approved question can be connected." : "That private learning record could not be found." }, { status: 409 });
    const values = { id: crypto.randomUUID(), ownerId, entityType, entityKey, linkType, targetId, createdAt: new Date().toISOString() };
    const [created] = await getDb().insert(learningEvidenceLinks).values(values).onConflictDoNothing().returning();
    const link = created ?? (await getDb().select().from(learningEvidenceLinks).where(and(eq(learningEvidenceLinks.ownerId, ownerId), eq(learningEvidenceLinks.entityType, entityType), eq(learningEvidenceLinks.entityKey, entityKey), eq(learningEvidenceLinks.linkType, linkType), eq(learningEvidenceLinks.targetId, targetId))).limit(1))[0];
    return Response.json({ link }, { status: created ? 201 : 200 });
  } catch { return Response.json({ error: "That learning connection could not be saved." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return Response.json({ error: "Choose a connection to remove." }, { status: 400 });
  try {
    await ensureVitaeSchema();
    const [removed] = await getDb().delete(learningEvidenceLinks).where(and(eq(learningEvidenceLinks.ownerId, ownerId), eq(learningEvidenceLinks.id, id))).returning();
    if (!removed) return Response.json({ error: "Connection not found." }, { status: 404 });
    return Response.json({ removed: true });
  } catch { return Response.json({ error: "That connection could not be removed." }, { status: 500 }); }
}
