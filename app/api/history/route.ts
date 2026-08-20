import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, learningVersions, lessonDrafts, lessonNotes, noteMindMaps } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { recordLearningVersion, type VersionedEntityType, versionLabel } from "@/lib/learning-history";

const entityTypes = new Set<VersionedEntityType>(["note", "mind_map", "alignment_review", "lesson_draft"]);

function parsePayload(value: string) {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return null; }
}

function expandedPayload(payload: Record<string, unknown>) {
  const expanded = { ...payload };
  for (const key of ["nodesJson", "outlineJson"]) {
    if (typeof expanded[key] === "string") {
      try { expanded[key.replace("Json", "")] = JSON.parse(expanded[key] as string); delete expanded[key]; } catch { /* Keep unreadable legacy JSON visible as text. */ }
    }
  }
  return expanded;
}

function flatten(value: unknown, path = "", result: Record<string, string> = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${path}[${index}]`, result));
  } else if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => flatten(item, path ? `${path}.${key}` : key, result));
  } else result[path || "value"] = value == null ? "" : String(value);
  return result;
}

function comparison(left: Record<string, unknown>, right: Record<string, unknown>) {
  const leftFields = flatten(expandedPayload(left));
  const rightFields = flatten(expandedPayload(right));
  return Array.from(new Set([...Object.keys(leftFields), ...Object.keys(rightFields)])).sort().flatMap((field) => leftFields[field] === rightFields[field] ? [] : [{ field, before: leftFields[field] ?? "—", after: rightFields[field] ?? "—" }]).slice(0, 500);
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const url = new URL(request.url);
    const requestedType = url.searchParams.get("type")?.trim() ?? "";
    const requestedKey = url.searchParams.get("key")?.trim() ?? "";
    const leftId = url.searchParams.get("left")?.trim() ?? "";
    const rightId = url.searchParams.get("right")?.trim() ?? "";
    if (leftId || rightId) {
      if (!leftId || !rightId || leftId === rightId) return Response.json({ error: "Choose two different versions to compare." }, { status: 400 });
      const [left, right] = await Promise.all([
        getDb().select().from(learningVersions).where(and(eq(learningVersions.ownerId, ownerId), eq(learningVersions.id, leftId))).limit(1).then((rows) => rows[0]),
        getDb().select().from(learningVersions).where(and(eq(learningVersions.ownerId, ownerId), eq(learningVersions.id, rightId))).limit(1).then((rows) => rows[0]),
      ]);
      if (!left || !right) return Response.json({ error: "One of those private versions could not be found." }, { status: 404 });
      if (left.entityType !== right.entityType || left.entityKey !== right.entityKey) return Response.json({ error: "Compare versions of the same note, map, mapping, or lesson." }, { status: 409 });
      const leftPayload = parsePayload(left.payloadJson); const rightPayload = parsePayload(right.payloadJson);
      if (!leftPayload || !rightPayload) return Response.json({ error: "One of those versions is no longer readable." }, { status: 422 });
      return Response.json({
        left: { id: left.id, entityType: left.entityType, entityKey: left.entityKey, action: left.action, summary: left.summary, createdAt: left.createdAt },
        right: { id: right.id, entityType: right.entityType, entityKey: right.entityKey, action: right.action, summary: right.summary, createdAt: right.createdAt },
        changes: comparison(leftPayload, rightPayload),
        confirmationKey: `${left.entityType}:${left.entityKey}`,
      });
    }
    const rows = await getDb().select().from(learningVersions).where(eq(learningVersions.ownerId, ownerId)).orderBy(desc(learningVersions.createdAt)).limit(250);
    const filtered = rows.filter((row) => (!requestedType || row.entityType === requestedType) && (!requestedKey || row.entityKey === requestedKey));
    const counts = Object.fromEntries([...entityTypes].map((type) => [type, rows.filter((row) => row.entityType === type).length]));
    return Response.json({
      versions: filtered.map((row) => ({ id: row.id, entityType: row.entityType, entityKey: row.entityKey, action: row.action, summary: row.summary, createdAt: row.createdAt })),
      counts,
      total: rows.length,
    });
  } catch { return Response.json({ error: "Learning history could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { versionId?: string; comparisonLeftId?: string; comparisonRightId?: string; confirmationKey?: string };
    const versionId = body.versionId?.trim() ?? "";
    const comparisonLeftId = body.comparisonLeftId?.trim() ?? "";
    const comparisonRightId = body.comparisonRightId?.trim() ?? "";
    if (!versionId || !comparisonLeftId || !comparisonRightId || comparisonLeftId === comparisonRightId || ![comparisonLeftId, comparisonRightId].includes(versionId)) return Response.json({ error: "Compare two versions and choose one from that preview before restoring." }, { status: 400 });
    await ensureVitaeSchema();
    const [version, comparisonLeft, comparisonRight] = await Promise.all([
      getDb().select().from(learningVersions).where(and(eq(learningVersions.ownerId, ownerId), eq(learningVersions.id, versionId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(learningVersions).where(and(eq(learningVersions.ownerId, ownerId), eq(learningVersions.id, comparisonLeftId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(learningVersions).where(and(eq(learningVersions.ownerId, ownerId), eq(learningVersions.id, comparisonRightId))).limit(1).then((rows) => rows[0]),
    ]);
    if (!version || !entityTypes.has(version.entityType as VersionedEntityType)) return Response.json({ error: "That private version could not be found." }, { status: 404 });
    if (!comparisonLeft || !comparisonRight || comparisonLeft.entityType !== version.entityType || comparisonRight.entityType !== version.entityType || comparisonLeft.entityKey !== version.entityKey || comparisonRight.entityKey !== version.entityKey || body.confirmationKey !== `${version.entityType}:${version.entityKey}`) return Response.json({ error: "The comparison preview is stale. Compare the two versions again before restoring." }, { status: 409 });
    const payload = parsePayload(version.payloadJson);
    if (!payload) return Response.json({ error: "That version is no longer readable." }, { status: 422 });
    const now = new Date().toISOString();
    const entityType = version.entityType as VersionedEntityType;
    let restored: unknown;

    if (entityType === "note") {
      const lessonSlug = String(payload.lessonSlug ?? "").slice(0, 120);
      const content = String(payload.content ?? "").slice(0, 30_000);
      if (!lessonSlug) return Response.json({ error: "The note version is incomplete." }, { status: 422 });
      const [current] = await getDb().select().from(lessonNotes).where(and(eq(lessonNotes.ownerId, ownerId), eq(lessonNotes.lessonSlug, lessonSlug))).limit(1);
      if (current) await recordLearningVersion({ ownerId, entityType, entityKey: lessonSlug, action: "pre_rollback", summary: "Safety copy before note rollback", payload: { lessonSlug, content: current.content, updatedAt: current.updatedAt } });
      [restored] = await getDb().insert(lessonNotes).values({ id: crypto.randomUUID(), ownerId, lessonSlug, content, updatedAt: now }).onConflictDoUpdate({ target: [lessonNotes.ownerId, lessonNotes.lessonSlug], set: { content, updatedAt: now } }).returning();
      await recordLearningVersion({ ownerId, entityType, entityKey: lessonSlug, action: "restored", summary: `Restored ${version.createdAt}`, payload: { lessonSlug, content, updatedAt: now }, createdAt: now });
    } else if (entityType === "mind_map") {
      const lessonSlug = String(payload.lessonSlug ?? "").slice(0, 120);
      const title = String(payload.title ?? "").slice(0, 180);
      const nodesJson = String(payload.nodesJson ?? "").slice(0, 20_000);
      if (!lessonSlug || !title || !nodesJson) return Response.json({ error: "The mind-map version is incomplete." }, { status: 422 });
      const [current] = await getDb().select().from(noteMindMaps).where(and(eq(noteMindMaps.ownerId, ownerId), eq(noteMindMaps.lessonSlug, lessonSlug))).limit(1);
      if (current) await recordLearningVersion({ ownerId, entityType, entityKey: lessonSlug, action: "pre_rollback", summary: "Safety copy before mind-map rollback", payload: { lessonSlug, title: current.title, nodesJson: current.nodesJson, createdAt: current.createdAt, updatedAt: current.updatedAt } });
      const createdAt = String(payload.createdAt ?? now);
      [restored] = await getDb().insert(noteMindMaps).values({ id: crypto.randomUUID(), ownerId, lessonSlug, title, nodesJson, createdAt, updatedAt: now }).onConflictDoUpdate({ target: [noteMindMaps.ownerId, noteMindMaps.lessonSlug], set: { title, nodesJson, updatedAt: now } }).returning();
      await recordLearningVersion({ ownerId, entityType, entityKey: lessonSlug, action: "restored", summary: `Restored ${title}`, payload: { lessonSlug, title, nodesJson, createdAt, updatedAt: now }, createdAt: now });
    } else if (entityType === "alignment_review") {
      const alignmentId = String(payload.alignmentId ?? "").slice(0, 120);
      const decision = String(payload.decision ?? "");
      const reviewerNote = String(payload.reviewerNote ?? "").slice(0, 1000);
      if (!alignmentId || !["pending", "approved", "changes_requested"].includes(decision)) return Response.json({ error: "The source-mapping version is incomplete." }, { status: 422 });
      const [current] = await getDb().select().from(alignmentReviews).where(and(eq(alignmentReviews.ownerId, ownerId), eq(alignmentReviews.alignmentId, alignmentId))).limit(1);
      if (current) await recordLearningVersion({ ownerId, entityType, entityKey: alignmentId, action: "pre_rollback", summary: "Safety copy before mapping rollback", payload: { alignmentId, decision: current.decision, reviewerNote: current.reviewerNote, updatedAt: current.updatedAt } });
      [restored] = await getDb().insert(alignmentReviews).values({ id: crypto.randomUUID(), ownerId, alignmentId, decision, reviewerNote, updatedAt: now }).onConflictDoUpdate({ target: [alignmentReviews.ownerId, alignmentReviews.alignmentId], set: { decision, reviewerNote, updatedAt: now } }).returning();
      await recordLearningVersion({ ownerId, entityType, entityKey: alignmentId, action: "restored", summary: `Restored mapping to ${decision.replaceAll("_", " ")}`, payload: { alignmentId, decision, reviewerNote, updatedAt: now }, createdAt: now });
    } else {
      const alignmentId = String(payload.alignmentId ?? "").slice(0, 120);
      const sourceDocumentId = String(payload.sourceDocumentId ?? "").slice(0, 120);
      const lessonSlug = String(payload.lessonSlug ?? "").slice(0, 160);
      const subject = String(payload.subject ?? "").slice(0, 160);
      const system = String(payload.system ?? "").slice(0, 120);
      const title = String(payload.title ?? "").slice(0, 240);
      const status = String(payload.status ?? "draft").slice(0, 40);
      const outlineJson = String(payload.outlineJson ?? "").slice(0, 60_000);
      if (!alignmentId || !sourceDocumentId || !lessonSlug || !subject || !system || !title || !outlineJson) return Response.json({ error: "The lesson-draft version is incomplete." }, { status: 422 });
      const [current] = await getDb().select().from(lessonDrafts).where(and(eq(lessonDrafts.ownerId, ownerId), eq(lessonDrafts.alignmentId, alignmentId))).limit(1);
      if (current) await recordLearningVersion({ ownerId, entityType, entityKey: alignmentId, action: "pre_rollback", summary: "Safety copy before lesson-draft rollback", payload: { alignmentId, sourceDocumentId: current.sourceDocumentId, lessonSlug: current.lessonSlug, subject: current.subject, system: current.system, title: current.title, status: current.status, outlineJson: current.outlineJson, createdAt: current.createdAt, updatedAt: current.updatedAt } });
      const createdAt = String(payload.createdAt ?? now);
      const values = { sourceDocumentId, lessonSlug, subject, system, title, status, outlineJson, updatedAt: now };
      [restored] = await getDb().insert(lessonDrafts).values({ id: crypto.randomUUID(), ownerId, alignmentId, ...values, createdAt }).onConflictDoUpdate({ target: [lessonDrafts.ownerId, lessonDrafts.alignmentId], set: values }).returning();
      await recordLearningVersion({ ownerId, entityType, entityKey: alignmentId, action: "restored", summary: `Restored ${title}`, payload: { alignmentId, ...values, createdAt }, createdAt: now });
    }
    return Response.json({ restored, entityType, label: versionLabel(entityType), restoredFrom: version.createdAt });
  } catch { return Response.json({ error: "That version could not be restored safely." }, { status: 500 }); }
}
