import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, importedAlignments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

const decisions = new Set(["pending", "approved", "changes_requested"]);
const knownStatuses = new Set([
  "strong_match", "partial_match", "needs_review", "conflicting_sources",
  "no_suitable_source", "outside_syllabus", "future_topic",
]);

type ImportedRow = {
  system: string;
  week: string;
  topic: string;
  primarySource: string;
  pageReference: string;
  supportSource: string;
  status: string;
  note: string;
};

function splitDelimited(line: string, delimiter: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      values.push(value.trim()); value = "";
    } else value += character;
  }
  values.push(value.trim());
  return values;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeStatus(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (knownStatuses.has(normalized)) return normalized;
  if (normalized.includes("strong")) return "strong_match";
  if (normalized.includes("partial")) return "partial_match";
  if (normalized.includes("conflict")) return "conflicting_sources";
  if (normalized.includes("outside")) return "outside_syllabus";
  if (normalized.includes("future")) return "future_topic";
  if (normalized.includes("missing") || normalized.includes("no_source") || normalized.includes("no_suitable")) return "no_suitable_source";
  return "needs_review";
}

function parseAlignmentTable(rawText: string): ImportedRow[] {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("Paste a header row and at least one alignment row.");

  const markdown = lines[0].includes("|");
  const delimiter = markdown ? "|" : lines[0].includes("\t") ? "\t" : ",";
  const parsed = lines.map((line) => splitDelimited(line.replace(markdown ? /^\||\|$/g : /$^/, ""), delimiter));
  const rows = markdown ? parsed.filter((row, index) => index !== 1 || !row.every((cell) => /^:?-{3,}:?$/.test(cell))) : parsed;
  const headers = rows[0].map(normalizeHeader);
  const find = (...names: string[]) => headers.findIndex((header) => names.some((name) => header === name || header.includes(name)));
  const columns = {
    system: find("system", "subject system"), week: find("week"), topic: find("topic", "syllabus objective", "objective"),
    primary: find("primary source", "primary textbook", "chapter", "book chapter"), pages: find("page", "pages", "page reference"),
    support: find("support", "supplementary", "alternative"), status: find("status", "coverage"), note: find("note", "uncertainty", "missing material"),
  };
  if (columns.topic < 0 || columns.primary < 0) throw new Error("The table needs Topic and Primary source/chapter columns.");

  return rows.slice(1).map((row) => ({
    system: (columns.system >= 0 ? row[columns.system] : "Imported")?.slice(0, 80) || "Imported",
    week: (columns.week >= 0 ? row[columns.week] : "")?.slice(0, 30) || "",
    topic: row[columns.topic]?.slice(0, 300) || "",
    primarySource: row[columns.primary]?.slice(0, 500) || "",
    pageReference: (columns.pages >= 0 ? row[columns.pages] : "")?.slice(0, 150) || "",
    supportSource: (columns.support >= 0 ? row[columns.support] : "")?.slice(0, 500) || "",
    status: normalizeStatus(columns.status >= 0 ? row[columns.status] ?? "" : ""),
    note: (columns.note >= 0 ? row[columns.note] : "")?.slice(0, 1000) || "",
  })).filter((row) => row.topic && row.primarySource).slice(0, 200);
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [reviews, imported] = await Promise.all([
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)).orderBy(desc(alignmentReviews.updatedAt)),
      getDb().select().from(importedAlignments).where(eq(importedAlignments.ownerId, ownerId)).orderBy(desc(importedAlignments.createdAt)),
    ]);
    return Response.json({ reviews, imported });
  } catch {
    return Response.json({ error: "Alignment workspace could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { title?: string; text?: string };
    const title = body.title?.trim().slice(0, 120) || "Imported alignment";
    const text = body.text?.trim() ?? "";
    if (!text || text.length > 100_000) return Response.json({ error: "Paste an alignment table under 100,000 characters." }, { status: 400 });
    const parsed = parseAlignmentTable(text);
    if (!parsed.length) return Response.json({ error: "No usable alignment rows were found." }, { status: 400 });
    await ensureVitaeSchema();
    const now = new Date().toISOString();
    const rows = parsed.map((row) => ({ id: crypto.randomUUID(), ownerId, batchTitle: title, ...row, createdAt: now }));
    await getDb().insert(importedAlignments).values(rows);
    return Response.json({ imported: rows }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The alignment table could not be imported." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { alignmentId?: string; decision?: string; note?: string };
    const alignmentId = body.alignmentId?.trim() ?? "";
    const decision = body.decision?.trim() ?? "";
    const reviewerNote = body.note?.trim().slice(0, 1000) ?? "";
    if (!alignmentId || alignmentId.length > 120 || !decisions.has(decision)) {
      return Response.json({ error: "Choose a valid alignment and review decision." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const updatedAt = new Date().toISOString();
    const [review] = await getDb().insert(alignmentReviews).values({
      id: crypto.randomUUID(), ownerId, alignmentId, decision, reviewerNote, updatedAt,
    }).onConflictDoUpdate({
      target: [alignmentReviews.ownerId, alignmentReviews.alignmentId],
      set: { decision, reviewerNote, updatedAt },
    }).returning();
    return Response.json({ review });
  } catch {
    return Response.json({ error: "The review decision could not be saved." }, { status: 500 });
  }
}
