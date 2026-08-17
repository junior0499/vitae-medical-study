import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, assessmentAttempts, clinicalReasoningProgress, dailyQueueActions, documentExtractions, documentSourceDetails, generatedQuestions, importedAlignments, learningActivityAttempts, learningVersions, lessonDrafts, lessonNotes, lessonProgress, misconceptionRepairs, mistakeNotebook, noteMindMaps, objectiveSourceLinks, recallReviews, recallReviewSignals, sourceCitations, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { calculateMastery } from "@/lib/mastery-calculation";

function sanitizeRows<T extends object>(rows: T[]) {
  return rows.map((row) => {
    const safe = { ...row } as Record<string, unknown>;
    delete safe.ownerId;
    delete safe.objectKey;
    return safe;
  });
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [progress, notes, documents, sourceDetails, extractions, citations, reviews, imported, drafts, recall, recallSignals, dailyActions, questions, supportLinks, reasoningProgress, repairs, assessments, mistakes, maps, activities, versions] = await Promise.all([
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(lessonNotes).where(eq(lessonNotes.ownerId, ownerId)),
      getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
      getDb().select().from(documentSourceDetails).where(eq(documentSourceDetails.ownerId, ownerId)),
      getDb().select().from(documentExtractions).where(eq(documentExtractions.ownerId, ownerId)),
      getDb().select().from(sourceCitations).where(eq(sourceCitations.ownerId, ownerId)),
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(importedAlignments).where(eq(importedAlignments.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)),
      getDb().select().from(recallReviewSignals).where(eq(recallReviewSignals.ownerId, ownerId)),
      getDb().select().from(dailyQueueActions).where(eq(dailyQueueActions.ownerId, ownerId)),
      getDb().select().from(generatedQuestions).where(eq(generatedQuestions.ownerId, ownerId)),
      getDb().select().from(objectiveSourceLinks).where(eq(objectiveSourceLinks.ownerId, ownerId)),
      getDb().select().from(clinicalReasoningProgress).where(eq(clinicalReasoningProgress.ownerId, ownerId)),
      getDb().select().from(misconceptionRepairs).where(eq(misconceptionRepairs.ownerId, ownerId)),
      getDb().select().from(assessmentAttempts).where(eq(assessmentAttempts.ownerId, ownerId)),
      getDb().select().from(mistakeNotebook).where(eq(mistakeNotebook.ownerId, ownerId)),
      getDb().select().from(noteMindMaps).where(eq(noteMindMaps.ownerId, ownerId)),
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)),
      getDb().select().from(learningVersions).where(eq(learningVersions.ownerId, ownerId)),
    ]);
    const mastery = calculateMastery({ progress, notes, attempts: assessments, activities, reviews: recall, mistakes });
    const summary = {
      lessons: progress.length,
      notes: notes.length,
      sourceFiles: documents.length,
      sourceCitations: citations.length,
      sourceMappings: reviews.length + imported.length,
      lessonDrafts: drafts.length,
      recallCards: recall.length,
      adaptiveReviewSignals: recallSignals.length,
      dailyQueueActions: dailyActions.length,
      generatedQuestions: questions.length,
      approvedSupportSources: supportLinks.length,
      clinicalReasoningStages: reasoningProgress.length,
      misconceptionRepairs: repairs.length,
      assessmentAttempts: assessments.length,
      learningActivities: activities.length,
      mistakes: mistakes.length,
      mindMaps: maps.length,
      savedVersions: versions.length,
      masteryScore: mastery.score,
    };
    if (new URL(request.url).searchParams.get("mode") === "summary") {
      return Response.json({ summary, scope: "Private structured learning data and source-file inventory. Uploaded file bytes are not duplicated in the export." });
    }
    const generatedAt = new Date().toISOString();
    const archive = {
      format: "poh-tah-toh-study-backup",
      schemaVersion: 3,
      generatedAt,
      privacy: "Owner-scoped export. Internal owner identifiers and storage object keys are excluded.",
      sourceFileNotice: "The archive includes source metadata and references, not copyrighted PDF or Word file bytes.",
      summary,
      mastery,
      data: {
        lessonProgress: sanitizeRows(progress),
        lessonNotes: sanitizeRows(notes),
        studyDocuments: sanitizeRows(documents),
        documentSourceDetails: sanitizeRows(sourceDetails),
        documentExtractions: sanitizeRows(extractions),
        sourceCitations: sanitizeRows(citations),
        alignmentReviews: sanitizeRows(reviews),
        importedAlignments: sanitizeRows(imported),
        lessonDrafts: sanitizeRows(drafts),
        recallReviews: sanitizeRows(recall),
        recallReviewSignals: sanitizeRows(recallSignals),
        dailyQueueActions: sanitizeRows(dailyActions),
        generatedQuestions: sanitizeRows(questions),
        objectiveSourceLinks: sanitizeRows(supportLinks),
        clinicalReasoningProgress: sanitizeRows(reasoningProgress),
        misconceptionRepairs: sanitizeRows(repairs),
        assessmentAttempts: sanitizeRows(assessments),
        learningActivityAttempts: sanitizeRows(activities),
        mistakeNotebook: sanitizeRows(mistakes),
        noteMindMaps: sanitizeRows(maps),
        learningVersions: sanitizeRows(versions),
      },
    };
    const date = generatedAt.slice(0, 10);
    return new Response(JSON.stringify(archive, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="poh-tah-toh-backup-${date}.json"`, "cache-control": "private, no-store" } });
  } catch { return Response.json({ error: "Your private study backup could not be prepared." }, { status: 500 }); }
}
