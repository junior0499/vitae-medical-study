import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureVitaeSchema, getStudyBucket } from "@/db/runtime-schema";
import { documentExtractions, documentSourceDetails, studyDocuments } from "@/db/schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 5;
const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/csv",
  "text/plain",
]);
const allowedCategories = new Set([
  "Textbook", "Book section", "Syllabus", "Alignment plan", "Table of contents", "Lecture notes", "Guideline",
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
    const [details, extractions] = rows.length ? await Promise.all([
      getDb().select().from(documentSourceDetails).where(inArray(documentSourceDetails.documentId, rows.map((row) => row.id))),
      getDb().select().from(documentExtractions).where(inArray(documentExtractions.documentId, rows.map((row) => row.id))),
    ]) : [[], []];
    const byDocument = new Map(details.map((detail) => [detail.documentId, detail]));
    const extractionByDocument = new Map(extractions.map((extraction) => [extraction.documentId, extraction]));
    return Response.json({ documents: rows.map((row) => ({ ...row, sourceDetails: byDocument.get(row.id) ?? null, extraction: extractionByDocument.get(row.id) ?? null })) });
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
    const bookTitle = String(form.get("bookTitle") ?? "").trim().slice(0, 180);
    const bookEdition = String(form.get("bookEdition") ?? "").trim().slice(0, 80);
    const sectionLabel = String(form.get("sectionLabel") ?? "").trim().slice(0, 180);
    const pageRange = String(form.get("pageRange") ?? "").trim().slice(0, 80);
    const files = form.getAll("files").filter((value): value is File => value instanceof File);

    if (!Number.isInteger(semester) || semester < 1 || semester > 7 || !subject || !allowedCategories.has(category)) {
      return Response.json({ error: "Choose a semester, subject, and source type." }, { status: 400 });
    }
    if (category === "Book section" && (!bookTitle || !sectionLabel)) {
      return Response.json({ error: "Add the book title and chapter or section name." }, { status: 400 });
    }
    if (!files.length || files.length > MAX_FILES) {
      return Response.json({ error: `Choose between 1 and ${MAX_FILES} files.` }, { status: 400 });
    }
    const invalid = files.find((file) => file.size <= 0 || file.size > MAX_FILE_SIZE || !allowedTypes.has(file.type));
    if (invalid) {
      return Response.json({ error: `${invalid.name} must be a PDF, Word, CSV, or text file under 25 MB.` }, { status: 400 });
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
      if (category === "Book section") {
        await getDb().insert(documentSourceDetails).values(uploaded.map((document) => ({
          id: crypto.randomUUID(), ownerId, documentId: document.id, bookTitle, bookEdition,
          sectionLabel, pageRange, createdAt: now,
        })));
      }
    } catch (error) {
      if (uploaded.length) await getDb().delete(studyDocuments).where(inArray(studyDocuments.id, uploaded.map((document) => document.id)));
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
      sourceDetails: category === "Book section" ? { bookTitle, bookEdition, sectionLabel, pageRange } : null,
      extraction: null,
    })) }, { status: 201 });
  } catch {
    return Response.json({ error: "The files could not be uploaded. Please try again." }, { status: 500 });
  }
}
