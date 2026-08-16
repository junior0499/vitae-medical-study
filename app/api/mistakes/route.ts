import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { mistakeNotebook } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const mistakes = await getDb().select().from(mistakeNotebook)
      .where(eq(mistakeNotebook.ownerId, ownerId)).orderBy(asc(mistakeNotebook.nextReviewAt));
    const now = new Date().toISOString();
    return Response.json({
      mistakes,
      summary: {
        open: mistakes.filter((item) => item.status === "open").length,
        resolved: mistakes.filter((item) => item.status === "resolved").length,
        due: mistakes.filter((item) => item.status === "open" && item.nextReviewAt <= now).length,
      },
    });
  } catch {
    return Response.json({ error: "Your mistake notebook could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { id?: string; status?: string; reason?: string };
    const id = body.id?.trim() ?? "";
    const status = body.status?.trim() ?? "";
    const reason = body.reason?.trim().slice(0, 1000) ?? "";
    if (!id || !new Set(["open", "resolved"]).has(status)) {
      return Response.json({ error: "Choose a valid mistake and status." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const updatedAt = new Date().toISOString();
    const nextReviewAt = status === "resolved"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const [mistake] = await getDb().update(mistakeNotebook).set({ status, reason, nextReviewAt, updatedAt })
      .where(and(eq(mistakeNotebook.ownerId, ownerId), eq(mistakeNotebook.id, id))).returning();
    if (!mistake) return Response.json({ error: "Mistake not found." }, { status: 404 });
    return Response.json({ mistake });
  } catch {
    return Response.json({ error: "The mistake could not be updated." }, { status: 500 });
  }
}
