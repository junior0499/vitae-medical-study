import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureVitaeSchema, getStudyBucket } from "@/db/runtime-schema";
import { studyDocuments } from "@/db/schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 5;
const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();

  try {
    await ensureVitaeSchema();
    const rows = await getDb().select({
      id: studyDocuments.id,
      semester: studyDocuments.semester,
      subject: studyDocuments.subject,
      category: studyDocuments.category,
      filename: studyDocuments.filename,
      contentType: studyDocuments.contentType,
      sizeBytes: studyDocuments.sizeBytes,
      status: studyDocuments.status,
      createdAt: studyDocuments.createdAt,
    }).from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId))
      .orderBy(desc(studyDocuments.createdAt));
    return Response.json({ documents: rows });
  } catch {
    return Response.json({ error: "Your library could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const semester = Number(form.get("semester"));
    const subject = String(form.get("subject") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const files = form.getAll("files").filter((value): value is File => value instanceof File);

    if (!Number.isInteger(semester) || semester < 1 || semester > 7 || !subject || !category) {
      return Response.json({ error: "Choose a semester, subject, and source type." }, { status: 400 });
    }
    if (!files.length || files.length > MAX_FILES) {
      return Response.json({ error: `Choose between 1 and ${MAX_FILES} files.` }, { status: 400 });
    }
    const invalid = files.find((file) => file.size <= 0 || file.size > MAX_FILE_SIZE || !allowedTypes.has(file.type));
    if (invalid) {
      return Response.json({ error: `${invalid.name} must be a PDF or Word file under 25 MB.` }, { status: 400 });
    }

    await ensureVitaeSchema();
    const bucket = getStudyBucket();
    const now = new Date().toISOString();
    const uploaded: Array<typeof studyDocuments.$inferInsert> = [];

    for (const file of files) {
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "document";
      const objectKey = `${ownerId}/semester-${semester}/${id}-${safeName}`;
      await bucket.put(objectKey, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { ownerId, semester: String(semester), subject, category },
      });
      uploaded.push({
        id, ownerId, semester, subject, category, filename: file.name.slice(0, 180),
        contentType: file.type, sizeBytes: file.size, objectKey, status: "ready", createdAt: now,
      });
    }

    try {
      await getDb().insert(studyDocuments).values(uploaded);
    } catch (error) {
      await Promise.all(uploaded.map((document) => bucket.delete(document.objectKey)));
      throw error;
    }

    return Response.json({ documents: uploaded.map((document) => ({
      id: document.id,
      semester: document.semester,
      subject: document.subject,
      category: document.category,
      filename: document.filename,
      contentType: document.contentType,
      sizeBytes: document.sizeBytes,
      status: document.status,
      createdAt: document.createdAt,
    })) }, { status: 201 });
  } catch {
    return Response.json({ error: "The files could not be uploaded. Please try again." }, { status: 500 });
  }
}
