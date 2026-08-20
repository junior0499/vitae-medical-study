type Field = { js: string; db: string; kind?: "number"; max?: number };
type RestoreSpec = { table: string; label: string; fields: Field[]; unique: string[] };

const text = (js: string, db: string, max = 60_000): Field => ({ js, db, max });
const number = (js: string, db: string): Field => ({ js, db, kind: "number" });

export const restoreSpecs: Record<string, RestoreSpec> = {
  lessonProgress: { table: "lesson_progress", label: "Lesson progress", unique: ["lessonSlug"], fields: [text("id", "id", 120), text("lessonSlug", "lesson_slug", 160), number("completedPoints", "completed_points"), number("totalPoints", "total_points"), text("status", "status", 40), text("updatedAt", "updated_at", 40)] },
  lessonNotes: { table: "lesson_notes", label: "Lesson notes", unique: ["lessonSlug"], fields: [text("id", "id", 120), text("lessonSlug", "lesson_slug", 160), text("content", "content", 30_000), text("updatedAt", "updated_at", 40)] },
  recallReviews: { table: "recall_reviews", label: "Recall schedule", unique: ["lessonSlug", "questionKey"], fields: [text("id", "id", 120), text("lessonSlug", "lesson_slug", 160), text("questionKey", "question_key", 180), text("question", "question", 2000), text("answer", "answer", 4000), text("lastRating", "last_rating", 40), number("repetitions", "repetitions"), number("intervalDays", "interval_days"), number("easeScore", "ease_score"), text("dueAt", "due_at", 40), text("lastReviewedAt", "last_reviewed_at", 40), text("updatedAt", "updated_at", 40)] },
  dailyQueueActions: { table: "daily_queue_actions", label: "Daily queue choices", unique: ["dateKey", "taskKey"], fields: [text("id", "id", 120), text("dateKey", "date_key", 20), text("taskKey", "task_key", 200), text("status", "status", 40), text("updatedAt", "updated_at", 40)] },
  clinicalReasoningProgress: { table: "clinical_reasoning_progress", label: "Clinical reasoning stages", unique: ["objectiveId", "stageKey"], fields: [text("id", "id", 120), text("objectiveId", "objective_id", 160), text("stageKey", "stage_key", 80), text("noteText", "note_text", 5000), text("status", "status", 40), text("documentId", "document_id", 120), number("pageNumber", "page_number"), text("printedPage", "printed_page", 40), text("sourceQuote", "source_quote", 1200), text("updatedAt", "updated_at", 40)] },
  misconceptionRepairs: { table: "misconception_repairs", label: "Misconception repairs", unique: ["conceptKey"], fields: [text("id", "id", 120), text("conceptKey", "concept_key", 180), text("lessonSlug", "lesson_slug", 160), text("reflection", "reflection", 5000), text("evidenceJson", "evidence_json", 20_000), text("status", "status", 40), text("completedAt", "completed_at", 40), text("updatedAt", "updated_at", 40)] },
  mistakeNotebook: { table: "mistake_notebook", label: "Mistake notebook", unique: ["assessmentId", "questionKey"], fields: [text("id", "id", 120), text("assessmentId", "assessment_id", 160), text("questionKey", "question_key", 180), text("subject", "subject", 160), text("lessonSlug", "lesson_slug", 160), text("prompt", "prompt", 4000), text("originalAnswer", "original_answer", 4000), text("correctedConcept", "corrected_concept", 5000), text("reason", "reason", 2000), text("sourceLabel", "source_label", 500), text("status", "status", 40), text("nextReviewAt", "next_review_at", 40), text("createdAt", "created_at", 40), text("updatedAt", "updated_at", 40)] },
  noteMindMaps: { table: "note_mind_maps", label: "Sideways mind maps", unique: ["lessonSlug"], fields: [text("id", "id", 120), text("lessonSlug", "lesson_slug", 160), text("title", "title", 240), text("nodesJson", "nodes_json", 30_000), text("createdAt", "created_at", 40), text("updatedAt", "updated_at", 40)] },
  learningVersions: { table: "learning_versions", label: "Learning version history", unique: ["id"], fields: [text("id", "id", 120), text("entityType", "entity_type", 80), text("entityKey", "entity_key", 180), text("action", "action", 40), text("summary", "summary", 300), text("payloadJson", "payload_json", 80_000), text("createdAt", "created_at", 40)] },
  questionQualityReviews: { table: "question_quality_reviews", label: "Question quality decisions", unique: ["questionKey"], fields: [text("id", "id", 120), text("questionKey", "question_key", 180), text("sourceKind", "source_kind", 120), text("decision", "decision", 40), text("flagsJson", "flags_json", 10_000), text("reviewerNote", "reviewer_note", 3000), text("updatedAt", "updated_at", 40)] },
  evidenceFreshnessReviews: { table: "evidence_freshness_reviews", label: "Evidence freshness reviews", unique: ["documentId", "objectiveId"], fields: [text("id", "id", 120), text("documentId", "document_id", 120), text("objectiveId", "objective_id", 160), text("sourceKind", "source_kind", 40), text("edition", "edition", 160), text("publicationDate", "publication_date", 20), text("reviewedAt", "reviewed_at", 20), text("reviewDueAt", "review_due_at", 20), text("decision", "decision", 40), text("conflictNote", "conflict_note", 3000), text("reviewerNote", "reviewer_note", 3000), text("updatedAt", "updated_at", 40)] },
};

export type SafeArchive = { format: string; schemaVersion: number; generatedAt?: string; data: Record<string, unknown[]> };

export function validateArchive(value: unknown): SafeArchive {
  if (!value || typeof value !== "object") throw new Error("This is not a Poh-tah-toh backup.");
  const archive = value as Partial<SafeArchive>;
  if (archive.format !== "poh-tah-toh-study-backup" || ![3, 4, 5].includes(Number(archive.schemaVersion)) || !archive.data || typeof archive.data !== "object") throw new Error("Choose an unedited Poh-tah-toh schema version 3, 4, or 5 backup.");
  const count = Object.values(archive.data).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
  if (count > 2000) throw new Error("This backup is larger than the 2,000-record safe restoration limit.");
  return archive as SafeArchive;
}

export function sanitizeGroup(group: string, rows: unknown[]) {
  const spec = restoreSpecs[group];
  if (!spec) return [];
  return rows.slice(0, 500).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const input = value as Record<string, unknown>; const result: Record<string, string | number> = {};
    for (const field of spec.fields) {
      if (field.kind === "number") {
        const parsed = Math.round(Number(input[field.js]));
        if (!Number.isFinite(parsed)) return [];
        result[field.js] = Math.max(0, Math.min(10_000_000, parsed));
      } else {
        const parsed = String(input[field.js] ?? "").replaceAll("\u0000", "").slice(0, field.max ?? 60_000);
        if (!parsed && ["id", ...spec.unique].includes(field.js)) return [];
        result[field.js] = parsed;
      }
    }
    return [result];
  });
}

export async function archiveDigest(archive: SafeArchive) {
  const bytes = new TextEncoder().encode(JSON.stringify(archive));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function uniqueKey(spec: RestoreSpec, row: Record<string, unknown>, databaseNames = false) {
  return spec.unique.map((field) => {
    const definition = spec.fields.find((item) => item.js === field);
    return String(row[databaseNames ? definition?.db ?? field : field] ?? "");
  }).join("\u001f");
}
