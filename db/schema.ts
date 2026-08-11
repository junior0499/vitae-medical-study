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
