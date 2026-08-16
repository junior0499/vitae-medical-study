import { getDb } from "@/db";
import { learningVersions } from "@/db/schema";

export type VersionedEntityType = "note" | "mind_map" | "alignment_review" | "lesson_draft";

export function versionLabel(entityType: VersionedEntityType) {
  return entityType === "note" ? "Lesson note" : entityType === "mind_map" ? "Sideways mind map" : entityType === "alignment_review" ? "Source mapping" : "Lesson draft";
}

export async function recordLearningVersion(input: {
  ownerId: string;
  entityType: VersionedEntityType;
  entityKey: string;
  action?: "saved" | "pre_rollback" | "restored";
  summary: string;
  payload: Record<string, unknown>;
  createdAt?: string;
}) {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const [version] = await getDb().insert(learningVersions).values({
    id: crypto.randomUUID(),
    ownerId: input.ownerId,
    entityType: input.entityType,
    entityKey: input.entityKey,
    action: input.action ?? "saved",
    summary: input.summary.slice(0, 240),
    payloadJson: JSON.stringify(input.payload),
    createdAt,
  }).returning();
  return version;
}
