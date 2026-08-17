import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, documentExtractions, documentSourceDetails, generatedQuestions, lessonDrafts, lessonProgress, recallReviews, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { coverageObjectives, getObjectiveLessonLinks } from "@/lib/subject-alignments";

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [reviews, drafts, progress, recall, documents, sourceDetails, extractions, questions] = await Promise.all([
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)),
      getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
      getDb().select().from(documentSourceDetails).where(eq(documentSourceDetails.ownerId, ownerId)),
      getDb().select().from(documentExtractions).where(eq(documentExtractions.ownerId, ownerId)),
      getDb().select().from(generatedQuestions).where(eq(generatedQuestions.ownerId, ownerId)),
    ]);
    const reviewMap = new Map(reviews.map((review) => [review.alignmentId, review.decision]));
    const draftMap = new Map(drafts.map((draft) => [draft.alignmentId, draft]));
    const documentMap = new Map(documents.map((document) => [document.id, document]));
    const detailsByDocument = new Map(sourceDetails.map((detail) => [detail.documentId, detail]));
    const extractionByDocument = new Map(extractions.map((extraction) => [extraction.documentId, extraction]));
    const progressMap = new Map(progress.map((item) => [item.lessonSlug, item]));
    const objectives = coverageObjectives.map((objective) => {
      const decision = reviewMap.get(objective.id) ?? "pending";
      const draft = draftMap.get(objective.id);
      const stage = draft ? "lesson_ready" : decision === "approved" ? "approved" : objective.mappingStatus === "missing" ? "missing_source" : objective.mappingStatus === "review" ? "needs_review" : "mapped";
      const linkedDocument = draft ? documentMap.get(draft.sourceDocumentId) : null;
      const linkedDetail = linkedDocument ? detailsByDocument.get(linkedDocument.id) : null;
      const extraction = linkedDocument ? extractionByDocument.get(linkedDocument.id) : null;
      const staticLessons = getObjectiveLessonLinks(objective.id);
      const lessonLinks = [...staticLessons, ...(draft ? [{ slug: draft.lessonSlug, title: draft.title, href: linkedDocument && extraction?.searchablePages ? `/reader/${linkedDocument.id}` : `/coverage#objective-${objective.id}`, draft: true }] : [])].filter((lesson, index, all) => all.findIndex((candidate) => candidate.slug === lesson.slug) === index);
      const objectiveQuestions = questions.filter((question) => question.objectiveId === objective.id);
      const lessonSlugs = new Set(lessonLinks.map((lesson) => lesson.slug));
      const recallCards = recall.filter((card) => lessonSlugs.has(card.lessonSlug));
      const completedLessons = lessonLinks.filter((lesson) => progressMap.get(lesson.slug)?.status === "complete").length;
      const gaps = [
        decision !== "approved" ? "Approve the chapter mapping" : "",
        objective.pageReference.toLowerCase().includes("check needed") || objective.pageReference.toLowerCase().includes("no approved") || objective.pageReference === "Not uploaded" ? "Confirm an exact page" : "",
        !linkedDocument ? "Attach the uploaded Book section" : "",
        linkedDocument && !extraction?.searchablePages ? "Build the deep page index" : "",
        !lessonLinks.length ? "Prepare the linked lesson" : "",
        !objectiveQuestions.some((question) => question.status === "approved") ? "Approve source-backed questions" : "",
      ].filter(Boolean);
      return {
        ...objective,
        decision,
        stage,
        draft: draft ?? null,
        lessonLinks,
        linkedSource: linkedDocument ? { id: linkedDocument.id, filename: linkedDocument.filename, bookTitle: linkedDetail?.bookTitle ?? "", sectionLabel: linkedDetail?.sectionLabel ?? "", pageRange: linkedDetail?.pageRange ?? "", searchablePages: extraction?.searchablePages ?? 0, readerHref: extraction?.searchablePages ? `/reader/${linkedDocument.id}` : "" } : null,
        questionSummary: { total: objectiveQuestions.length, pending: objectiveQuestions.filter((question) => question.status === "pending_review").length, approved: objectiveQuestions.filter((question) => question.status === "approved").length, types: Array.from(new Set(objectiveQuestions.map((question) => question.questionType))) },
        learningEvidence: { completedLessons, totalLessons: lessonLinks.length, recallCards: recallCards.length, reviewedCards: recallCards.filter((card) => card.repetitions > 0).length },
        gaps,
      };
    });
    const now = new Date().toISOString();
    const bookSections = documents.filter((document) => document.category === "Book section").map((document) => ({
      id: document.id,
      subject: document.subject,
      filename: document.filename,
      sourceDetails: detailsByDocument.get(document.id) ?? null,
    }));
    return Response.json({
      objectives,
      bookSections,
      summary: {
        total: objectives.length,
        approved: objectives.filter((item) => item.decision === "approved").length,
        lessonReady: objectives.filter((item) => item.stage === "lesson_ready").length,
        mapped: objectives.filter((item) => item.stage === "mapped").length,
        needsReview: objectives.filter((item) => item.stage === "needs_review").length,
        missingSource: objectives.filter((item) => item.stage === "missing_source").length,
        completedLessons: progress.filter((item) => item.status === "complete").length,
        dueReviews: recall.filter((item) => item.dueAt <= now).length,
        exactPageReady: objectives.filter((item) => !item.gaps.includes("Confirm an exact page")).length,
        sourceLinked: objectives.filter((item) => item.linkedSource).length,
        questionReady: objectives.filter((item) => item.questionSummary.approved > 0).length,
        gapCount: objectives.reduce((count, item) => count + item.gaps.length, 0),
      },
    });
  } catch {
    return Response.json({ error: "Syllabus coverage could not be loaded." }, { status: 500 });
  }
}
