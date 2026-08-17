import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const lessonProgress = sqliteTable("lesson_progress", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  completedPoints: integer("completed_points").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(1),
  status: text("status").notNull().default("in_progress"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_lesson_progress_owner_lesson").on(table.ownerId, table.lessonSlug),
  index("idx_lesson_progress_owner_updated").on(table.ownerId, table.updatedAt),
]);

export const lessonNotes = sqliteTable("lesson_notes", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_lesson_notes_owner_lesson").on(table.ownerId, table.lessonSlug),
]);

export const studyDocuments = sqliteTable("study_documents", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  semester: integer("semester").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  objectKey: text("object_key").notNull(),
  status: text("status").notNull().default("ready"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_study_documents_owner_created").on(table.ownerId, table.createdAt),
  index("idx_study_documents_owner_semester").on(table.ownerId, table.semester),
]);

export const documentSourceDetails = sqliteTable("document_source_details", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  documentId: text("document_id").notNull(),
  bookTitle: text("book_title").notNull().default(""),
  bookEdition: text("book_edition").notNull().default(""),
  sectionLabel: text("section_label").notNull().default(""),
  pageRange: text("page_range").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_document_source_details_owner_document").on(table.ownerId, table.documentId),
]);

export const documentExtractions = sqliteTable("document_extractions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  documentId: text("document_id").notNull(),
  status: text("status").notNull().default("pending"),
  method: text("method").notNull().default(""),
  pageCount: integer("page_count").notNull().default(0),
  searchablePages: integer("searchable_pages").notNull().default(0),
  characterCount: integer("character_count").notNull().default(0),
  warning: text("warning").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_document_extractions_owner_document").on(table.ownerId, table.documentId),
  index("idx_document_extractions_owner_status").on(table.ownerId, table.status),
]);

export const documentTextChunks = sqliteTable("document_text_chunks", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  documentId: text("document_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  printedPage: text("printed_page").notNull().default(""),
  textContent: text("text_content").notNull(),
  method: text("method").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_document_text_owner_document_page").on(table.ownerId, table.documentId, table.pageNumber),
]);

export const sourceCitations = sqliteTable("source_citations", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  documentId: text("document_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  pageNumber: integer("page_number").notNull(),
  printedPage: text("printed_page").notNull().default(""),
  quote: text("quote").notNull(),
  noteText: text("note_text").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_source_citations_owner_lesson_created").on(table.ownerId, table.lessonSlug, table.createdAt),
  index("idx_source_citations_owner_document_page").on(table.ownerId, table.documentId, table.pageNumber),
]);

export const alignmentReviews = sqliteTable("alignment_reviews", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  alignmentId: text("alignment_id").notNull(),
  decision: text("decision").notNull().default("pending"),
  reviewerNote: text("reviewer_note").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_alignment_reviews_owner_alignment").on(table.ownerId, table.alignmentId),
  index("idx_alignment_reviews_owner_decision").on(table.ownerId, table.decision),
]);

export const importedAlignments = sqliteTable("imported_alignments", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  batchTitle: text("batch_title").notNull(),
  system: text("system").notNull(),
  week: text("week").notNull().default(""),
  topic: text("topic").notNull(),
  primarySource: text("primary_source").notNull(),
  pageReference: text("page_reference").notNull().default(""),
  supportSource: text("support_source").notNull().default(""),
  status: text("status").notNull().default("needs_review"),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_imported_alignments_owner_created").on(table.ownerId, table.createdAt),
]);

export const lessonDrafts = sqliteTable("lesson_drafts", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  alignmentId: text("alignment_id").notNull(),
  sourceDocumentId: text("source_document_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  subject: text("subject").notNull(),
  system: text("system").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  outlineJson: text("outline_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_lesson_drafts_owner_alignment").on(table.ownerId, table.alignmentId),
  index("idx_lesson_drafts_owner_updated").on(table.ownerId, table.updatedAt),
]);

export const recallReviews = sqliteTable("recall_reviews", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  questionKey: text("question_key").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  lastRating: text("last_rating").notNull().default("good"),
  repetitions: integer("repetitions").notNull().default(0),
  intervalDays: integer("interval_days").notNull().default(1),
  easeScore: integer("ease_score").notNull().default(250),
  dueAt: text("due_at").notNull(),
  lastReviewedAt: text("last_reviewed_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_recall_reviews_owner_question").on(table.ownerId, table.lessonSlug, table.questionKey),
  index("idx_recall_reviews_owner_due").on(table.ownerId, table.dueAt),
]);

export const recallReviewSignals = sqliteTable("recall_review_signals", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  questionKey: text("question_key").notNull(),
  difficulty: text("difficulty").notNull().default("medium"),
  confidence: text("confidence").notNull().default("medium"),
  wasCorrect: integer("was_correct").notNull().default(1),
  lapseCount: integer("lapse_count").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  accuracyStreak: integer("accuracy_streak").notNull().default(0),
  averageResponseMs: integer("average_response_ms").notNull().default(0),
  forgettingScore: integer("forgetting_score").notNull().default(0),
  nextIntervalDays: integer("next_interval_days").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_recall_signals_owner_question").on(table.ownerId, table.lessonSlug, table.questionKey),
  index("idx_recall_signals_owner_forgetting").on(table.ownerId, table.forgettingScore),
]);

export const dailyQueueActions = sqliteTable("daily_queue_actions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  dateKey: text("date_key").notNull(),
  taskKey: text("task_key").notNull(),
  status: text("status").notNull().default("pending"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_daily_queue_owner_date_task").on(table.ownerId, table.dateKey, table.taskKey),
  index("idx_daily_queue_owner_date").on(table.ownerId, table.dateKey),
]);

export const generatedQuestions = sqliteTable("generated_questions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  objectiveId: text("objective_id").notNull(),
  documentId: text("document_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  printedPage: text("printed_page").notNull().default(""),
  questionType: text("question_type").notNull(),
  prompt: text("prompt").notNull(),
  optionsJson: text("options_json").notNull().default("[]"),
  answer: text("answer").notNull(),
  explanation: text("explanation").notNull().default(""),
  sourceQuote: text("source_quote").notNull(),
  status: text("status").notNull().default("pending_review"),
  reviewerNote: text("reviewer_note").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_generated_questions_owner_objective_status").on(table.ownerId, table.objectiveId, table.status),
  index("idx_generated_questions_owner_status_updated").on(table.ownerId, table.status, table.updatedAt),
]);

export const assessmentAttempts = sqliteTable("assessment_attempts", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  assessmentId: text("assessment_id").notNull(),
  subject: text("subject").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  questionType: text("question_type").notNull().default("mcq"),
  correctCount: integer("correct_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(1),
  answersJson: text("answers_json").notNull(),
  completedAt: text("completed_at").notNull(),
}, (table) => [
  index("idx_assessment_attempts_owner_completed").on(table.ownerId, table.completedAt),
  index("idx_assessment_attempts_owner_subject").on(table.ownerId, table.subject),
]);

export const mistakeNotebook = sqliteTable("mistake_notebook", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  assessmentId: text("assessment_id").notNull(),
  questionKey: text("question_key").notNull(),
  subject: text("subject").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  prompt: text("prompt").notNull(),
  originalAnswer: text("original_answer").notNull().default(""),
  correctedConcept: text("corrected_concept").notNull(),
  reason: text("reason").notNull().default(""),
  sourceLabel: text("source_label").notNull(),
  status: text("status").notNull().default("open"),
  nextReviewAt: text("next_review_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_mistake_notebook_owner_question").on(table.ownerId, table.assessmentId, table.questionKey),
  index("idx_mistake_notebook_owner_status_review").on(table.ownerId, table.status, table.nextReviewAt),
]);

export const noteMindMaps = sqliteTable("note_mind_maps", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  lessonSlug: text("lesson_slug").notNull(),
  title: text("title").notNull(),
  nodesJson: text("nodes_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_note_mind_maps_owner_lesson").on(table.ownerId, table.lessonSlug),
  index("idx_note_mind_maps_owner_updated").on(table.ownerId, table.updatedAt),
]);

export const learningActivityAttempts = sqliteTable("learning_activity_attempts", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  activityType: text("activity_type").notNull(),
  activityId: text("activity_id").notNull(),
  subject: text("subject").notNull(),
  system: text("system").notNull(),
  correctCount: integer("correct_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(1),
  detailsJson: text("details_json").notNull(),
  completedAt: text("completed_at").notNull(),
}, (table) => [
  index("idx_learning_activity_owner_type_completed").on(table.ownerId, table.activityType, table.completedAt),
  index("idx_learning_activity_owner_activity").on(table.ownerId, table.activityId),
]);

export const learningVersions = sqliteTable("learning_versions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityKey: text("entity_key").notNull(),
  action: text("action").notNull().default("saved"),
  summary: text("summary").notNull().default(""),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_learning_versions_owner_created").on(table.ownerId, table.createdAt),
  index("idx_learning_versions_owner_entity_created").on(table.ownerId, table.entityType, table.entityKey, table.createdAt),
]);
