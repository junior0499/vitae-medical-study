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
    database.prepare(`CREATE TABLE IF NOT EXISTS document_extractions (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      method TEXT DEFAULT '' NOT NULL,
      page_count INTEGER DEFAULT 0 NOT NULL,
      searchable_pages INTEGER DEFAULT 0 NOT NULL,
      character_count INTEGER DEFAULT 0 NOT NULL,
      warning TEXT DEFAULT '' NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_document_extractions_owner_document
      ON document_extractions(owner_id, document_id)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_document_extractions_owner_status
      ON document_extractions(owner_id, status)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS document_text_chunks (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      printed_page TEXT DEFAULT '' NOT NULL,
      text_content TEXT NOT NULL,
      method TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_document_text_owner_document_page
      ON document_text_chunks(owner_id, document_id, page_number)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS source_citations (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      printed_page TEXT DEFAULT '' NOT NULL,
      quote TEXT NOT NULL,
      note_text TEXT DEFAULT '' NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_source_citations_owner_lesson_created
      ON source_citations(owner_id, lesson_slug, created_at)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_source_citations_owner_document_page
      ON source_citations(owner_id, document_id, page_number)`),
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
    database.prepare(`CREATE TABLE IF NOT EXISTS recall_review_signals (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      question_key TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium' NOT NULL,
      confidence TEXT DEFAULT 'medium' NOT NULL,
      was_correct INTEGER DEFAULT 1 NOT NULL,
      lapse_count INTEGER DEFAULT 0 NOT NULL,
      review_count INTEGER DEFAULT 0 NOT NULL,
      accuracy_streak INTEGER DEFAULT 0 NOT NULL,
      average_response_ms INTEGER DEFAULT 0 NOT NULL,
      forgetting_score INTEGER DEFAULT 0 NOT NULL,
      next_interval_days INTEGER DEFAULT 1 NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_recall_signals_owner_question
      ON recall_review_signals(owner_id, lesson_slug, question_key)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_recall_signals_owner_forgetting
      ON recall_review_signals(owner_id, forgetting_score)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS daily_queue_actions (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      task_key TEXT NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_queue_owner_date_task
      ON daily_queue_actions(owner_id, date_key, task_key)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_daily_queue_owner_date
      ON daily_queue_actions(owner_id, date_key)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS generated_questions (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      objective_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      printed_page TEXT DEFAULT '' NOT NULL,
      question_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      options_json TEXT DEFAULT '[]' NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT DEFAULT '' NOT NULL,
      source_quote TEXT NOT NULL,
      status TEXT DEFAULT 'pending_review' NOT NULL,
      reviewer_note TEXT DEFAULT '' NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_generated_questions_owner_objective_status
      ON generated_questions(owner_id, objective_id, status)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_generated_questions_owner_status_updated
      ON generated_questions(owner_id, status, updated_at)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS objective_source_links (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      objective_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      role TEXT DEFAULT 'support' NOT NULL,
      decision TEXT DEFAULT 'pending_review' NOT NULL,
      reviewer_note TEXT DEFAULT '' NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_objective_source_owner_objective_document
      ON objective_source_links(owner_id, objective_id, document_id)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_objective_source_owner_objective_decision
      ON objective_source_links(owner_id, objective_id, decision)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_objective_source_owner_document
      ON objective_source_links(owner_id, document_id)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS clinical_reasoning_progress (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      objective_id TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      note_text TEXT DEFAULT '' NOT NULL,
      status TEXT DEFAULT 'complete' NOT NULL,
      document_id TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      printed_page TEXT DEFAULT '' NOT NULL,
      source_quote TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reasoning_progress_owner_objective_stage
      ON clinical_reasoning_progress(owner_id, objective_id, stage_key)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_reasoning_progress_owner_objective
      ON clinical_reasoning_progress(owner_id, objective_id)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS misconception_repairs (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      concept_key TEXT NOT NULL,
      lesson_slug TEXT NOT NULL,
      reflection TEXT DEFAULT '' NOT NULL,
      evidence_json TEXT DEFAULT '{}' NOT NULL,
      status TEXT DEFAULT 'completed' NOT NULL,
      completed_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_misconception_repairs_owner_concept
      ON misconception_repairs(owner_id, concept_key)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_misconception_repairs_owner_updated
      ON misconception_repairs(owner_id, updated_at)`),
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
    database.prepare(`CREATE TABLE IF NOT EXISTS learning_activity_attempts (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      system TEXT NOT NULL,
      correct_count INTEGER DEFAULT 0 NOT NULL,
      total_count INTEGER DEFAULT 1 NOT NULL,
      details_json TEXT NOT NULL,
      completed_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_learning_activity_owner_type_completed
      ON learning_activity_attempts(owner_id, activity_type, completed_at)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_learning_activity_owner_activity
      ON learning_activity_attempts(owner_id, activity_id)`),
    database.prepare(`CREATE TABLE IF NOT EXISTS learning_versions (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_key TEXT NOT NULL,
      action TEXT DEFAULT 'saved' NOT NULL,
      summary TEXT DEFAULT '' NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_learning_versions_owner_created
      ON learning_versions(owner_id, created_at)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_learning_versions_owner_entity_created
      ON learning_versions(owner_id, entity_type, entity_key, created_at)`),
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
