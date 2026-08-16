import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonNotes } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { recordLearningVersion } from "@/lib/learning-history";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  const lessonSlug = new URL(request.url).searchParams.get("lesson")?.trim() ?? "";
  if (!lessonSlug) return Response.json({ error: "lesson is required" }, { status: 400 });

  try {
    await ensureVitaeSchema();
    const [note] = await getDb().select().from(lessonNotes).where(and(
      eq(lessonNotes.ownerId, ownerId),
      eq(lessonNotes.lessonSlug, lessonSlug),
    )).limit(1);
    return Response.json({ note: note ?? null });
  } catch {
    return Response.json({ error: "Notes could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();

  try {
    const body = await request.json() as { lessonSlug?: string; content?: string };
    const lessonSlug = body.lessonSlug?.trim() ?? "";
    const content = body.content?.slice(0, 30_000) ?? "";
    if (!lessonSlug || lessonSlug.length > 120) {
      return Response.json({ error: "A valid lesson is required." }, { status: 400 });
    }

    await ensureVitaeSchema();
    const now = new Date().toISOString();
    const [saved] = await getDb().insert(lessonNotes).values({
      id: crypto.randomUUID(), ownerId, lessonSlug, content, updatedAt: now,
    }).onConflictDoUpdate({
      target: [lessonNotes.ownerId, lessonNotes.lessonSlug],
      set: { content, updatedAt: now },
    }).returning();
    await recordLearningVersion({ ownerId, entityType: "note", entityKey: lessonSlug, summary: content.trim().replace(/\s+/g, " ").slice(0, 180) || "Empty note", payload: { lessonSlug, content, updatedAt: now }, createdAt: now });
    return Response.json({ note: saved });
  } catch {
    return Response.json({ error: "Notes could not be saved." }, { status: 500 });
  }
}
