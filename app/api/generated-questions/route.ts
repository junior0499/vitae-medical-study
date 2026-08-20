import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentExtractions, documentSourceDetails, documentTextChunks, evidenceFreshnessReviews, generatedQuestions, lessonDrafts, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { coverageObjectives, findCoverageObjective } from "@/lib/subject-alignments";

const questionTypes = new Set(["mcq", "saq", "viva", "clinical_case"]);
const reviewStatuses = new Set(["pending_review", "approved", "changes_requested"]);
const stopWords = new Set(["about", "after", "again", "against", "because", "before", "being", "between", "could", "during", "every", "first", "from", "have", "into", "more", "other", "should", "their", "there", "these", "this", "those", "through", "under", "using", "which", "while", "with", "would"]);

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return Array.from(new Set((value.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).filter((word) => !stopWords.has(word))));
}

function sentences(text: string) {
  return normalize(text).split(/(?<=[.!?])\s+/).map(normalize).filter((sentence) => sentence.length >= 40 && sentence.length <= 700);
}

function sourceLabel(document: typeof studyDocuments.$inferSelect, detail: typeof documentSourceDetails.$inferSelect | null, pageNumber: number, printedPage: string) {
  const page = printedPage ? `p. ${printedPage}` : `PDF page ${pageNumber}`;
  return [detail?.bookTitle || document.filename, detail?.bookEdition, detail?.sectionLabel, page].filter(Boolean).join(" · ");
}

function publicQuestion(question: typeof generatedQuestions.$inferSelect) {
  let options: string[] = [];
  try { options = JSON.parse(question.optionsJson) as string[]; } catch { /* Keep malformed legacy options empty. */ }
  return { id: question.id, objectiveId: question.objectiveId, documentId: question.documentId, pageNumber: question.pageNumber, printedPage: question.printedPage, questionType: question.questionType, prompt: question.prompt, options, answer: question.answer, explanation: question.explanation, sourceQuote: question.sourceQuote, status: question.status, reviewerNote: question.reviewerNote, createdAt: question.createdAt, updatedAt: question.updatedAt, readerHref: `/reader/${question.documentId}?page=${question.pageNumber}` };
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [questions, reviews, drafts, documents, details, extractions] = await Promise.all([
      getDb().select().from(generatedQuestions).where(eq(generatedQuestions.ownerId, ownerId)).orderBy(desc(generatedQuestions.updatedAt)),
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
      getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
      getDb().select().from(documentSourceDetails).where(eq(documentSourceDetails.ownerId, ownerId)),
      getDb().select().from(documentExtractions).where(eq(documentExtractions.ownerId, ownerId)),
    ]);
    const reviewMap = new Map(reviews.map((review) => [review.alignmentId, review.decision]));
    const draftMap = new Map(drafts.map((draft) => [draft.alignmentId, draft]));
    const documentMap = new Map(documents.map((document) => [document.id, document]));
    const detailMap = new Map(details.map((detail) => [detail.documentId, detail]));
    const extractionMap = new Map(extractions.map((extraction) => [extraction.documentId, extraction]));
    const eligibleObjectives = coverageObjectives.flatMap((objective) => {
      const draft = draftMap.get(objective.id);
      const document = draft ? documentMap.get(draft.sourceDocumentId) : null;
      const extraction = document ? extractionMap.get(document.id) : null;
      if (reviewMap.get(objective.id) !== "approved" || !draft || !document || !extraction?.searchablePages) return [];
      const detail = detailMap.get(document.id) ?? null;
      return [{ id: objective.id, subject: objective.subject, system: objective.system, topic: objective.topic, lessonSlug: draft.lessonSlug, sourceDocumentId: document.id, sourceLabel: sourceLabel(document, detail, 1, detail?.pageRange.match(/\d+/)?.[0] ?? ""), searchablePages: extraction.searchablePages }];
    });
    return Response.json({
      eligibleObjectives,
      questions: questions.map(publicQuestion),
      summary: { total: questions.length, pending: questions.filter((question) => question.status === "pending_review").length, approved: questions.filter((question) => question.status === "approved").length, changesRequested: questions.filter((question) => question.status === "changes_requested").length },
    });
  } catch { return Response.json({ error: "The approved-source question studio could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { objectiveId?: string; types?: string[] };
    const objectiveId = body.objectiveId?.trim() ?? "";
    const objective = findCoverageObjective(objectiveId);
    const requestedTypes = Array.isArray(body.types) ? Array.from(new Set(body.types.filter((type) => questionTypes.has(type)))) : Array.from(questionTypes);
    if (!objective || !requestedTypes.length) return Response.json({ error: "Choose an eligible objective and at least one question type." }, { status: 400 });
    await ensureVitaeSchema();
    const [review, draft] = await Promise.all([
      getDb().select().from(alignmentReviews).where(and(eq(alignmentReviews.ownerId, ownerId), eq(alignmentReviews.alignmentId, objectiveId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(lessonDrafts).where(and(eq(lessonDrafts.ownerId, ownerId), eq(lessonDrafts.alignmentId, objectiveId))).limit(1).then((rows) => rows[0]),
    ]);
    if (review?.decision !== "approved") return Response.json({ error: "Approve this objective’s source mapping first.", code: "approval_required" }, { status: 409 });
    if (!draft) return Response.json({ error: "Create a lesson draft linked to an uploaded Book section first.", code: "lesson_source_required" }, { status: 409 });
    const freshness = await getDb().select().from(evidenceFreshnessReviews).where(eq(evidenceFreshnessReviews.ownerId, ownerId));
    const freshnessReview = freshness.find((item) => item.documentId === draft.sourceDocumentId && item.objectiveId === objectiveId) ?? freshness.find((item) => item.documentId === draft.sourceDocumentId && !item.objectiveId);
    const today = new Date().toISOString().slice(0, 10);
    if (freshnessReview?.decision === "superseded" || freshnessReview?.decision === "verified_current" && freshnessReview.reviewDueAt && freshnessReview.reviewDueAt <= today) return Response.json({ error: "This source is superseded or due for freshness review. Review it before creating new questions.", code: "freshness_review_required" }, { status: 409 });
    const [document, detail, extraction, chunks] = await Promise.all([
      getDb().select().from(studyDocuments).where(and(eq(studyDocuments.ownerId, ownerId), eq(studyDocuments.id, draft.sourceDocumentId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(documentSourceDetails).where(and(eq(documentSourceDetails.ownerId, ownerId), eq(documentSourceDetails.documentId, draft.sourceDocumentId))).limit(1).then((rows) => rows[0] ?? null),
      getDb().select().from(documentExtractions).where(and(eq(documentExtractions.ownerId, ownerId), eq(documentExtractions.documentId, draft.sourceDocumentId))).limit(1).then((rows) => rows[0]),
      getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), eq(documentTextChunks.documentId, draft.sourceDocumentId))),
    ]);
    if (!document || !extraction?.searchablePages || !chunks.length) return Response.json({ error: "Build the deep index for the linked Book section first.", code: "index_required" }, { status: 409 });

    const objectiveTokens = tokens(objective.topic);
    const candidates = chunks.flatMap((chunk) => sentences(chunk.textContent).map((sentence) => ({ sentence, chunk, score: objectiveTokens.reduce((score, token) => score + (sentence.toLowerCase().includes(token) ? 2 : 0), 0) }))).sort((a, b) => b.score - a.score || a.chunk.pageNumber - b.chunk.pageNumber || b.sentence.length - a.sentence.length);
    const evidence = candidates.find((candidate) => candidate.score > 0);
    if (!evidence) return Response.json({ error: "No indexed passage matches this objective closely enough. Review the source link instead of generating questions.", code: "passage_not_found" }, { status: 409 });
    const quote = evidence.sentence.slice(0, 700);
    const evidenceWords = tokens(quote).sort((a, b) => b.length - a.length);
    const documentWords = tokens(chunks.map((chunk) => chunk.textContent).join(" ")).sort((a, b) => b.length - a.length);
    const answerTerm = evidenceWords[0] ?? objectiveTokens[0] ?? "principle";
    const distractors = Array.from(new Set([...documentWords, ...objectiveTokens])).filter((word) => word !== answerTerm && !evidenceWords.slice(0, 2).includes(word)).slice(0, 3);
    if (requestedTypes.includes("mcq") && distractors.length < 3) return Response.json({ error: "This indexed passage is too short to create three defensible MCQ distractors. Add a fuller section or generate the written formats only.", code: "mcq_source_too_short" }, { status: 409 });
    const options = [answerTerm, ...distractors.slice(0, 3)];
    const cloze = quote.replace(new RegExp(`\\b${answerTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"), "____");
    const label = sourceLabel(document, detail, evidence.chunk.pageNumber, evidence.chunk.printedPage);
    const now = new Date().toISOString();
    const common = { ownerId, objectiveId, documentId: document.id, pageNumber: evidence.chunk.pageNumber, printedPage: evidence.chunk.printedPage, sourceQuote: quote, status: "pending_review", reviewerNote: "", createdAt: now, updatedAt: now };
    const drafts = requestedTypes.map((type) => {
      if (type === "mcq") return { ...common, id: crypto.randomUUID(), questionType: type, prompt: `Complete the approved source statement for “${objective.topic}”: ${cloze}`, optionsJson: JSON.stringify(options), answer: answerTerm, explanation: `The keyed term appears in the exact approved passage on ${label}. Review wording and distractors before approval.` };
      if (type === "saq") return { ...common, id: crypto.randomUUID(), questionType: type, prompt: `Using only the approved passage, write a short structured answer for: ${objective.topic}.`, optionsJson: "[]", answer: quote, explanation: `Mark against the cited passage on ${label}; accept faithful paraphrases only after human review.` };
      if (type === "viva") return { ...common, id: crypto.randomUUID(), questionType: type, prompt: `Explain ${objective.topic} aloud, then identify the source-backed statement that supports your explanation.`, optionsJson: "[]", answer: quote, explanation: `The examiner anchor is the cited passage on ${label}. Add follow-up prompts only during review.` };
      return { ...common, id: crypto.randomUUID(), questionType: type, prompt: `Clinical case draft: a patient encounter raises the syllabus objective “${objective.topic}”. Which source-backed principle should anchor your reasoning before you add patient-specific findings?`, optionsJson: "[]", answer: quote, explanation: `This is deliberately a case scaffold, not a fabricated vignette. Add clinically accurate findings during human review using ${label}.` };
    });
    await getDb().delete(generatedQuestions).where(and(eq(generatedQuestions.ownerId, ownerId), eq(generatedQuestions.objectiveId, objectiveId), ne(generatedQuestions.status, "approved")));
    const saved = await getDb().insert(generatedQuestions).values(drafts).returning();
    return Response.json({ questions: saved.map(publicQuestion), sourceLabel: label, reviewGate: "pending_review" }, { status: 201 });
  } catch { return Response.json({ error: "Source-backed question drafts could not be created." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { id?: string; status?: string; reviewerNote?: string };
    const id = body.id?.trim() ?? "";
    const status = body.status?.trim() ?? "";
    const reviewerNote = String(body.reviewerNote ?? "").trim().slice(0, 1000);
    if (!id || !reviewStatuses.has(status)) return Response.json({ error: "Choose a valid question and review decision." }, { status: 400 });
    await ensureVitaeSchema();
    const [question] = await getDb().select().from(generatedQuestions).where(and(eq(generatedQuestions.ownerId, ownerId), eq(generatedQuestions.id, id))).limit(1);
    if (!question) return Response.json({ error: "Question draft not found." }, { status: 404 });
    if (status === "approved") {
      const [review, chunk] = await Promise.all([
        getDb().select().from(alignmentReviews).where(and(eq(alignmentReviews.ownerId, ownerId), eq(alignmentReviews.alignmentId, question.objectiveId))).limit(1).then((rows) => rows[0]),
        getDb().select().from(documentTextChunks).where(and(eq(documentTextChunks.ownerId, ownerId), eq(documentTextChunks.documentId, question.documentId), eq(documentTextChunks.pageNumber, question.pageNumber))).limit(1).then((rows) => rows[0]),
      ]);
      if (review?.decision !== "approved" || !chunk || !normalize(chunk.textContent).includes(normalize(question.sourceQuote))) return Response.json({ error: "The approved mapping or exact source passage changed. Regenerate this draft before approval." }, { status: 409 });
    }
    const [saved] = await getDb().update(generatedQuestions).set({ status, reviewerNote, updatedAt: new Date().toISOString() }).where(and(eq(generatedQuestions.ownerId, ownerId), eq(generatedQuestions.id, id))).returning();
    return Response.json({ question: publicQuestion(saved) });
  } catch { return Response.json({ error: "The question review could not be saved." }, { status: 500 }); }
}
