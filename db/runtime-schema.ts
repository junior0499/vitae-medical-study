import { env } from "cloudflare:workers";

let schemaPromise: Promise<void> | null = null;

function getD1() {
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("Study storage is not available.");
  return database;
}

export function ensureVitaeSchema() {
  if (schemaPromise) return schemaPromise;
  const database = getD1();
  schemaPromise = database.batch([
    database.prepare(`CREATE TABLE IF NOT EXISTS lesson_progress (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      completed_points INTEGER DEFAULT 0 NOT NULL,
      total_points INTEGER DEFAULT 1 NOT NULL,
      status TEXT DEFAULT 'in_progress' NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_progress_owner_lesson
      ON lesson_progress(owner_id, lesson_slug)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_lesson_progress_owner_updated
      ON lesson_progress(owner_id, updated_at)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS lesson_notes (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      content TEXT DEFAULT '' NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_notes_owner_lesson
      ON lesson_notes(owner_id, lesson_slug)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS study_documents (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      semester INTEGER NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      object_key TEXT NOT NULL,
      status TEXT DEFAULT 'ready' NOT NULL,
      created_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_study_documents_owner_created
      ON study_documents(owner_id, created_at)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_study_documents_owner_semester
      ON study_documents(owner_id, semester)`),
    database.prepare("PRAGMA optimize"),
  ]).then(() => undefined).catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

export function getStudyBucket() {
  const bucket = (env as unknown as { DOCUMENTS?: R2Bucket }).DOCUMENTS;
  if (!bucket) throw new Error("Document storage is not available.");
  return bucket;
}
