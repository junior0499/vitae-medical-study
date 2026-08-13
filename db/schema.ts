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
