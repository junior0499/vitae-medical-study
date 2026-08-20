import { getDb } from "@/db";
import { backupRestoreAudits } from "@/db/schema";
import { ensureVitaeSchema, getStudyDatabase } from "@/db/runtime-schema";
import { archiveDigest, restoreSpecs, sanitizeGroup, uniqueKey, validateArchive } from "@/lib/backup-restore";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

async function readBody(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 3_000_000) throw new Error("The restoration file must be smaller than 3 MB.");
  return request.json() as Promise<{ mode?: string; archive?: unknown; digest?: string; selectedGroups?: string[] }>;
}

async function inspectGroup(ownerId: string, group: string, rows: Array<Record<string, string | number>>) {
  const spec = restoreSpecs[group];
  const selected = ["id", ...spec.unique.map((field) => spec.fields.find((item) => item.js === field)?.db ?? field)];
  const existing = await getStudyDatabase().prepare(`SELECT ${Array.from(new Set(selected)).join(", ")} FROM ${spec.table} WHERE owner_id = ? LIMIT 5000`).bind(ownerId).all<Record<string, unknown>>();
  const existingIds = new Set(existing.results.map((row: Record<string, unknown>) => String(row.id ?? "")));
  const existingKeys = new Set(existing.results.map((row: Record<string, unknown>) => uniqueKey(spec, row, true)));
  const seenIds = new Set<string>(); const seenKeys = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    const id = String(row.id); const key = uniqueKey(spec, row);
    if (existingIds.has(id) || existingKeys.has(key) || seenIds.has(id) || seenKeys.has(key)) duplicates += 1;
    seenIds.add(id); seenKeys.add(key);
  }
  return { group, label: spec.label, total: rows.length, ready: rows.length - duplicates, duplicates };
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await readBody(request);
    const archive = validateArchive(body.archive);
    await ensureVitaeSchema();
    const digest = await archiveDigest(archive);
    const groups = await Promise.all(Object.keys(restoreSpecs).map(async (group) => inspectGroup(ownerId, group, sanitizeGroup(group, Array.isArray(archive.data[group]) ? archive.data[group] : []))));
    const unsupported = Object.entries(archive.data).filter(([group, rows]) => !restoreSpecs[group] && Array.isArray(rows) && rows.length).map(([group, rows]) => ({ group, total: rows.length, reason: "Kept in the archive but not restored automatically because it depends on source files or newer relational records." }));
    if (body.mode !== "restore") return Response.json({ digest, generatedAt: archive.generatedAt ?? "", groups, unsupported, totals: { ready: groups.reduce((sum, group) => sum + group.ready, 0), duplicates: groups.reduce((sum, group) => sum + group.duplicates, 0) } });
    if (body.digest !== digest) return Response.json({ error: "The backup changed after preview. Preview the file again." }, { status: 409 });
    const selectedGroups = Array.from(new Set(Array.isArray(body.selectedGroups) ? body.selectedGroups.filter((group) => restoreSpecs[group]) : []));
    if (!selectedGroups.length) return Response.json({ error: "Choose at least one record group to restore." }, { status: 400 });
    const database = getStudyDatabase(); let insertedCount = 0; let skippedCount = 0; const restored: Array<{ group: string; inserted: number; skipped: number }> = [];
    for (const group of selectedGroups) {
      const spec = restoreSpecs[group]; const rows = sanitizeGroup(group, Array.isArray(archive.data[group]) ? archive.data[group] : []);
      const inspection = await inspectGroup(ownerId, group, rows); const existingRows = await database.prepare(`SELECT ${["id", ...spec.unique.map((field) => spec.fields.find((item) => item.js === field)?.db ?? field)].join(", ")} FROM ${spec.table} WHERE owner_id = ? LIMIT 5000`).bind(ownerId).all<Record<string, unknown>>();
      const ids = new Set(existingRows.results.map((row: Record<string, unknown>) => String(row.id ?? ""))); const keys = new Set(existingRows.results.map((row: Record<string, unknown>) => uniqueKey(spec, row, true)));
      const insertable = rows.filter((row) => { const id = String(row.id); const key = uniqueKey(spec, row); if (ids.has(id) || keys.has(key)) return false; ids.add(id); keys.add(key); return true; });
      const columns = ["owner_id", ...spec.fields.map((field) => field.db)]; const placeholders = columns.map(() => "?").join(", ");
      for (let offset = 0; offset < insertable.length; offset += 40) {
        const statements = insertable.slice(offset, offset + 40).map((row) => database.prepare(`INSERT OR IGNORE INTO ${spec.table} (${columns.join(", ")}) VALUES (${placeholders})`).bind(ownerId, ...spec.fields.map((field) => row[field.js])));
        if (statements.length) await database.batch(statements);
      }
      insertedCount += insertable.length; skippedCount += inspection.duplicates; restored.push({ group, inserted: insertable.length, skipped: inspection.duplicates });
    }
    await getDb().insert(backupRestoreAudits).values({ id: crypto.randomUUID(), ownerId, archiveDigest: digest, selectedGroupsJson: JSON.stringify(selectedGroups), insertedCount, skippedCount, createdAt: new Date().toISOString() });
    return Response.json({ restored, insertedCount, skippedCount, message: `${insertedCount} records restored; ${skippedCount} existing records left unchanged.` });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "This backup could not be restored safely." }, { status: 400 }); }
}
