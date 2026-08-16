import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { noteMindMaps } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

type MindMapNode = { label: string; detail: string };

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const lessonSlug = new URL(request.url).searchParams.get("lesson")?.trim() ?? "";
    const rows = lessonSlug
      ? await getDb().select().from(noteMindMaps).where(and(eq(noteMindMaps.ownerId, ownerId), eq(noteMindMaps.lessonSlug, lessonSlug))).limit(1)
      : await getDb().select().from(noteMindMaps).where(eq(noteMindMaps.ownerId, ownerId)).orderBy(desc(noteMindMaps.updatedAt));
    return Response.json({ maps: rows });
  } catch {
    return Response.json({ error: "Mind maps could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { lessonSlug?: string; title?: string; nodes?: MindMapNode[] };
    const lessonSlug = body.lessonSlug?.trim().slice(0, 120) ?? "";
    const title = body.title?.trim().slice(0, 180) ?? "";
    const nodes = Array.isArray(body.nodes) ? body.nodes.slice(0, 8).map((node) => ({
      label: String(node.label ?? "").trim().slice(0, 60),
      detail: String(node.detail ?? "").trim().slice(0, 220),
    })).filter((node) => node.label && node.detail) : [];
    if (!lessonSlug || !title || nodes.length < 2) {
      return Response.json({ error: "Write at least two clear note points before building a map." }, { status: 400 });
    }
    await ensureVitaeSchema();
    const now = new Date().toISOString();
    const values = { title, nodesJson: JSON.stringify(nodes), updatedAt: now };
    const [map] = await getDb().insert(noteMindMaps).values({
      id: crypto.randomUUID(), ownerId, lessonSlug, ...values, createdAt: now,
    }).onConflictDoUpdate({
      target: [noteMindMaps.ownerId, noteMindMaps.lessonSlug], set: values,
    }).returning();
    return Response.json({ map });
  } catch {
    return Response.json({ error: "The sideways map could not be saved." }, { status: 500 });
  }
}
