import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureVitaeSchema, getStudyBucket } from "@/db/runtime-schema";
import { studyDocuments } from "@/db/schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();

  try {
    const { id } = await context.params;
    await ensureVitaeSchema();
    const [document] = await getDb().select().from(studyDocuments).where(and(
      eq(studyDocuments.id, id),
      eq(studyDocuments.ownerId, ownerId),
    )).limit(1);
    if (!document) return new Response("Document not found", { status: 404 });

    const object = await getStudyBucket().get(document.objectKey);
    if (!object) return new Response("Document not found", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-disposition", `inline; filename="${document.filename.replace(/["\\]/g, "-")}"`);
    headers.set("cache-control", "private, no-store");
    return new Response(object.body, { headers });
  } catch {
    return new Response("Document could not be opened", { status: 500 });
  }
}
