import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assessmentAttempts, learningActivityAttempts, lessonNotes, lessonProgress, mistakeNotebook, recallReviews } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [progress, notes, attempts, activities, reviews, mistakes] = await Promise.all([
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(lessonNotes).where(eq(lessonNotes.ownerId, ownerId)),
      getDb().select().from(assessmentAttempts).where(eq(assessmentAttempts.ownerId, ownerId)),
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)),
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)),
      getDb().select().from(mistakeNotebook).where(eq(mistakeNotebook.ownerId, ownerId)),
    ]);
    const progressComponent = Math.round(average(progress.map((item) => Math.min(1, item.completedPoints / Math.max(1, item.totalPoints)))) * 30);
    const notesComponent = Math.round(average(notes.map((item) => Math.min(1, item.content.trim().length / 200))) * 10);
    const totalAnswered = attempts.reduce((sum, item) => sum + item.totalCount, 0);
    const totalCorrect = attempts.reduce((sum, item) => sum + item.correctCount, 0);
    const assessmentComponent = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 20) : 0;
    const activityAnswered = activities.reduce((sum, item) => sum + item.totalCount, 0);
    const activityCorrect = activities.reduce((sum, item) => sum + item.correctCount, 0);
    const applicationComponent = activityAnswered ? Math.round((activityCorrect / activityAnswered) * 20) : 0;
    const reviewValue = average(reviews.map((item) => item.lastRating === "good" ? 1 : item.lastRating === "hard" ? 0.6 : 0.2));
    const reviewComponent = Math.round(reviewValue * 20);
    const score = Math.min(100, progressComponent + notesComponent + assessmentComponent + applicationComponent + reviewComponent);
    const level = score >= 80 ? "Strong" : score >= 60 ? "Practised" : score >= 30 ? "Building" : "Starting";
    return Response.json({
      score,
      level,
      components: {
        lessonCompletion: progressComponent,
        notes: notesComponent,
        assessments: assessmentComponent,
        application: applicationComponent,
        recall: reviewComponent,
      },
      evidence: {
        lessons: progress.length,
        completedLessons: progress.filter((item) => item.status === "complete").length,
        noteCount: notes.filter((item) => item.content.trim()).length,
        questionsAnswered: totalAnswered,
        applicationQuestions: activityAnswered,
        diagnosticAttempts: activities.filter((item) => item.activityType === "diagnostic").length,
        caseAttempts: activities.filter((item) => item.activityType === "clinical_case").length,
        visualLabAttempts: activities.filter((item) => item.activityType === "visual_lab").length,
        vivaAttempts: activities.filter((item) => item.activityType === "oral_viva").length,
        interleavedAttempts: activities.filter((item) => item.activityType === "interleaved_review").length,
        reviewCards: reviews.length,
        openMistakes: mistakes.filter((item) => item.status === "open").length,
      },
    });
  } catch {
    return Response.json({ error: "Mastery evidence could not be calculated." }, { status: 500 });
  }
}
