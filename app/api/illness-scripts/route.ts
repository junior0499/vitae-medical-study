import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { illnessScripts, sourceLearningPacks } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { recordLearningVersion } from "@/lib/learning-history";

const fields = ["condition", "enablingConditions", "mechanism", "consequences", "presentation", "investigations", "differentials", "management"] as const;
const decisions = new Set(["pending_review", "approved", "changes_requested"]);
const evidenceStates = new Set(["supported", "not_in_source", "not_required"]);
type ScriptField = (typeof fields)[number];
type EvidenceState = "supported" | "not_in_source" | "not_required";
type ScriptPayload = { fields: Record<ScriptField, string>; evidence: Record<ScriptField, EvidenceState> };

function normalize(value: unknown, max = 4000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseScript(value: string): ScriptPayload {
  try {
    const parsed = JSON.parse(value) as Partial<ScriptPayload>;
    return {
      fields: Object.fromEntries(fields.map((field) => [field, normalize(parsed.fields?.[field])])) as Record<ScriptField, string>,
      evidence: Object.fromEntries(fields.map((field) => [field, evidenceStates.has(parsed.evidence?.[field] ?? "") ? parsed.evidence?.[field] : "not_in_source"])) as Record<ScriptField, EvidenceState>,
    };
  } catch {
    return { fields: Object.fromEntries(fields.map((field) => [field, ""])) as Record<ScriptField, string>, evidence: Object.fromEntries(fields.map((field) => [field, "not_in_source"])) as Record<ScriptField, EvidenceState> };
  }
}

function publicScript(script: typeof illnessScripts.$inferSelect) {
  return { ...script, script: parseScript(script.scriptJson) };
}

function cleanPayload(input: unknown): ScriptPayload {
  const value = input && typeof input === "object" ? input as Partial<ScriptPayload> : {};
  return {
    fields: Object.fromEntries(fields.map((field) => [field, normalize(value.fields?.[field])])) as Record<ScriptField, string>,
    evidence: Object.fromEntries(fields.map((field) => { const state = value.evidence?.[field]; return [field, evidenceStates.has(state ?? "") ? state : "not_in_source"]; })) as Record<ScriptField, EvidenceState>,
  };
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [packs, scripts] = await Promise.all([
      getDb().select().from(sourceLearningPacks).where(eq(sourceLearningPacks.ownerId, ownerId)).orderBy(desc(sourceLearningPacks.updatedAt)),
      getDb().select().from(illnessScripts).where(eq(illnessScripts.ownerId, ownerId)).orderBy(desc(illnessScripts.updatedAt)),
    ]);
    return Response.json({
      packs: packs.filter((pack) => pack.status === "approved").map((pack) => ({ id: pack.id, objectiveId: pack.objectiveId, title: pack.title, sourceLabel: pack.sourceLabel, sourceQuote: pack.sourceQuote, readerHref: `/reader/${pack.documentId}?page=${pack.pageNumber}` })),
      scripts: scripts.map(publicScript),
      summary: { total: scripts.length, approved: scripts.filter((item) => item.status === "approved").length, pending: scripts.filter((item) => item.status === "pending_review").length },
    });
  } catch {
    return Response.json({ error: "Illness scripts could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { id?: string; sourcePackId?: string; title?: string; script?: unknown };
    const id = body.id?.trim() ?? "";
    const sourcePackId = body.sourcePackId?.trim() ?? "";
    const title = normalize(body.title, 240);
    const payload = cleanPayload(body.script);
    if (!sourcePackId || title.length < 2 || payload.fields.condition.length < 2) return Response.json({ error: "Choose an approved source pack and name the condition before saving." }, { status: 400 });
    await ensureVitaeSchema();
    const [pack] = await getDb().select().from(sourceLearningPacks).where(and(eq(sourceLearningPacks.ownerId, ownerId), eq(sourceLearningPacks.id, sourcePackId))).limit(1);
    if (!pack || pack.status !== "approved") return Response.json({ error: "Approve the exact source learning pack before building an illness script.", code: "source_pack_approval_required" }, { status: 409 });
    const now = new Date().toISOString();
    const values = { sourcePackId, title, scriptJson: JSON.stringify(payload), status: "pending_review", reviewerNote: "", updatedAt: now };
    let saved: typeof illnessScripts.$inferSelect;
    if (id) {
      const [existing] = await getDb().select().from(illnessScripts).where(and(eq(illnessScripts.ownerId, ownerId), eq(illnessScripts.id, id))).limit(1);
      if (!existing) return Response.json({ error: "Illness script not found." }, { status: 404 });
      [saved] = await getDb().update(illnessScripts).set(values).where(and(eq(illnessScripts.ownerId, ownerId), eq(illnessScripts.id, id))).returning();
    } else {
      [saved] = await getDb().insert(illnessScripts).values({ id: crypto.randomUUID(), ownerId, ...values, createdAt: now }).onConflictDoUpdate({ target: [illnessScripts.ownerId, illnessScripts.sourcePackId, illnessScripts.title], set: values }).returning();
    }
    await recordLearningVersion({ ownerId, entityType: "illness_script", entityKey: saved.id, summary: `${title} · pending review`, payload: publicScript(saved), createdAt: now });
    return Response.json({ illnessScript: publicScript(saved), reviewGate: "pending_review" }, { status: 201 });
  } catch {
    return Response.json({ error: "The illness script could not be saved." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { id?: string; status?: string; reviewerNote?: string };
    const id = body.id?.trim() ?? "";
    const status = body.status?.trim() ?? "";
    const reviewerNote = normalize(body.reviewerNote, 2000);
    if (!id || !decisions.has(status)) return Response.json({ error: "Choose a valid script and review decision." }, { status: 400 });
    await ensureVitaeSchema();
    const [script] = await getDb().select().from(illnessScripts).where(and(eq(illnessScripts.ownerId, ownerId), eq(illnessScripts.id, id))).limit(1);
    if (!script) return Response.json({ error: "Illness script not found." }, { status: 404 });
    if (status === "approved") {
      const [pack] = await getDb().select().from(sourceLearningPacks).where(and(eq(sourceLearningPacks.ownerId, ownerId), eq(sourceLearningPacks.id, script.sourcePackId))).limit(1);
      if (!pack || pack.status !== "approved") return Response.json({ error: "The linked source pack is no longer approved." }, { status: 409 });
      const payload = parseScript(script.scriptJson);
      const required: ScriptField[] = ["condition", "mechanism", "presentation", "investigations"];
      if (required.some((field) => !payload.fields[field])) return Response.json({ error: "Condition, mechanism, presentation, and investigations are required before approval." }, { status: 409 });
      const unsupported = fields.filter((field) => payload.fields[field] && payload.evidence[field] !== "supported");
      if (unsupported.length) return Response.json({ error: `Clear or source-review these fields before approval: ${unsupported.join(", ")}.` }, { status: 409 });
    }
    const updatedAt = new Date().toISOString();
    const [saved] = await getDb().update(illnessScripts).set({ status, reviewerNote, updatedAt }).where(and(eq(illnessScripts.ownerId, ownerId), eq(illnessScripts.id, id))).returning();
    await recordLearningVersion({ ownerId, entityType: "illness_script", entityKey: id, summary: `${saved.title} · ${status}`, payload: publicScript(saved), createdAt: updatedAt });
    return Response.json({ illnessScript: publicScript(saved) });
  } catch {
    return Response.json({ error: "The illness-script review could not be saved." }, { status: 500 });
  }
}
