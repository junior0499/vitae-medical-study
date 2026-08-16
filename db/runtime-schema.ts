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
    database.prepare(`CREATE TABLE IF NOT EXISTS document_source_details (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      book_title TEXT DEFAULT '' NOT NULL,
      book_edition TEXT DEFAULT '' NOT NULL,
      section_label TEXT DEFAULT '' NOT NULL,
      page_range TEXT DEFAULT '' NOT NULL,
      created_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_document_source_details_owner_document
      ON document_source_details(owner_id, document_id)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS alignment_reviews (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      alignment_id TEXT NOT NULL,
      decision TEXT DEFAULT 'pending' NOT NULL,
      reviewer_note TEXT DEFAULT '' NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_alignment_reviews_owner_alignment
      ON alignment_reviews(owner_id, alignment_id)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_alignment_reviews_owner_decision
      ON alignment_reviews(owner_id, decision)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS imported_alignments (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      batch_title TEXT NOT NULL,
      system TEXT NOT NULL,
      week TEXT DEFAULT '' NOT NULL,
      topic TEXT NOT NULL,
      primary_source TEXT NOT NULL,
      page_reference TEXT DEFAULT '' NOT NULL,
      support_source TEXT DEFAULT '' NOT NULL,
      status TEXT DEFAULT 'needs_review' NOT NULL,
      note TEXT DEFAULT '' NOT NULL,
      created_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_imported_alignments_owner_created
      ON imported_alignments(owner_id, created_at)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS lesson_drafts (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      alignment_id TEXT NOT NULL,
      source_document_id TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      subject TEXT NOT NULL,
      system TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft' NOT NULL,
      outline_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_drafts_owner_alignment
      ON lesson_drafts(owner_id, alignment_id)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_lesson_drafts_owner_updated
      ON lesson_drafts(owner_id, updated_at)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS recall_reviews (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      question_key TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      last_rating TEXT DEFAULT 'good' NOT NULL,
      repetitions INTEGER DEFAULT 0 NOT NULL,
      interval_days INTEGER DEFAULT 1 NOT NULL,
      ease_score INTEGER DEFAULT 250 NOT NULL,
      due_at TEXT NOT NULL,
      last_reviewed_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_recall_reviews_owner_question
      ON recall_reviews(owner_id, lesson_slug, question_key)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_recall_reviews_owner_due
      ON recall_reviews(owner_id, due_at)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS assessment_attempts (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      assessment_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      question_type TEXT DEFAULT 'mcq' NOT NULL,
      correct_count INTEGER DEFAULT 0 NOT NULL,
      total_count INTEGER DEFAULT 1 NOT NULL,
      answers_json TEXT NOT NULL,
      completed_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_assessment_attempts_owner_completed
      ON assessment_attempts(owner_id, completed_at)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_assessment_attempts_owner_subject
      ON assessment_attempts(owner_id, subject)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS mistake_notebook (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      assessment_id TEXT NOT NULL,
      question_key TEXT NOT NULL,
      subject TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      prompt TEXT NOT NULL,
      original_answer TEXT DEFAULT '' NOT NULL,
      corrected_concept TEXT NOT NULL,
      reason TEXT DEFAULT '' NOT NULL,
      source_label TEXT NOT NULL,
      status TEXT DEFAULT 'open' NOT NULL,
      next_review_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_mistake_notebook_owner_question
      ON mistake_notebook(owner_id, assessment_id, question_key)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_mistake_notebook_owner_status_review
      ON mistake_notebook(owner_id, status, next_review_at)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS note_mind_maps (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      nodes_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_note_mind_maps_owner_lesson
      ON note_mind_maps(owner_id, lesson_slug)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_note_mind_maps_owner_updated
      ON note_mind_maps(owner_id, updated_at)`),
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
