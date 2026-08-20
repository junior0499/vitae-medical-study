import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, generatedQuestions, learningActivityAttempts, lessonDrafts, lessonProgress, mistakeNotebook } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { cardiovascularPathwayNodes, cardiovascularProgressTest, professorPrompts, scoreProfessorResponse } from "@/lib/cardiovascular-pathway";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { saveLearningAttempt, saveProfessorAttempt } from "@/lib/learning-attempts";

type Confidence = "low" | "medium" | "high";
type AttemptDetails = {
  promptId?: string;
  lessonSlug?: string;
  score?: number;
  domainScores?: Record<string, number>;
  confidence?: Record<string, Confidence>;
  results?: Array<{ questionId: string; correct: boolean }>;
  nextTestAt?: string;
};

function parseDetails(value: string): AttemptDetails {
  try { return JSON.parse(value) as AttemptDetails; } catch { return {}; }
}

function promptRisk(lessonSlug: "cardiac-cycle" | "cardiac-output", activities: Array<typeof learningActivityAttempts.$inferSelect>, mistakes: Array<typeof mistakeNotebook.$inferSelect>) {
  const latestScores = activities.map((attempt) => parseDetails(attempt.detailsJson).domainScores).find(Boolean) ?? {};
  const scoreRisk = 100 - (latestScores[lessonSlug] ?? 50);
  const mistakeRisk = mistakes.filter((mistake) => mistake.status === "open" && mistake.lessonSlug === lessonSlug).length * 16;
  const confidenceRisk = activities.reduce((count, attempt) => {
    const details = parseDetails(attempt.detailsJson);
    return count + (details.results ?? []).filter((result) => !result.correct && details.confidence?.[result.questionId] === "high").length * 10;
  }, 0);
  return scoreRisk + mistakeRisk + confidenceRisk;
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [progress, reviews, drafts, activities, mistakes, questions] = await Promise.all([
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt)),
      getDb().select().from(mistakeNotebook).where(eq(mistakeNotebook.ownerId, ownerId)),
      getDb().select().from(generatedQuestions).where(eq(generatedQuestions.ownerId, ownerId)),
    ]);

    const progressMap = new Map(progress.map((item) => [item.lessonSlug, item]));
    const reviewMap = new Map(reviews.map((item) => [item.alignmentId, item.decision]));
    const draftMap = new Map(drafts.map((item) => [item.alignmentId, item]));
    const nodes = cardiovascularPathwayNodes.map((node) => {
      if (node.id === "foundation-cardiac-cycle" || node.id === "foundation-cardiac-output") {
        const slug = node.id.replace("foundation-", "");
        const lesson = progressMap.get(slug);
        const prerequisiteComplete = node.prerequisites.every((id) => progressMap.get(id.replace("foundation-", ""))?.status === "complete");
        const state = lesson?.status === "complete" ? "complete" : lesson ? "active" : prerequisiteComplete ? "ready" : "locked";
        return { ...node, state, evidence: lesson ? `${lesson.completedPoints}/${lesson.totalPoints} lesson points` : "No lesson evidence yet", gate: state === "locked" ? "Complete the preceding foundation" : "Live source-trailed lesson" };
      }
      const decision = reviewMap.get(node.id) ?? "pending";
      const draft = draftMap.get(node.id);
      const approvedQuestions = questions.filter((question) => question.objectiveId === node.id && question.status === "approved").length;
      const state = draft ? "lesson_ready" : decision === "approved" ? "source_ready" : "source_gate";
      return {
        ...node,
        state,
        evidence: draft ? `${approvedQuestions} approved questions · lesson draft ready` : decision === "approved" ? `${approvedQuestions} approved questions · source route approved` : "Clinical teaching locked",
        gate: draft ? "Human review before teaching" : decision === "approved" ? "Attach the matching section and prepare the lesson" : "Approve the exact chapter and page first",
      };
    });

    const professorAttempts = activities.filter((attempt) => attempt.activityType === "professor_dialogue");
    const attemptCounts = new Map<string, number>();
    professorAttempts.forEach((attempt) => attemptCounts.set(attempt.activityId, (attemptCounts.get(attempt.activityId) ?? 0) + 1));
    const cycleRisk = promptRisk("cardiac-cycle", activities, mistakes);
    const outputRisk = promptRisk("cardiac-output", activities, mistakes);
    const weakDomain = cycleRisk >= outputRisk ? "cardiac-cycle" : "cardiac-output";
    const adaptivePrompt = [...professorPrompts.filter((prompt) => prompt.lessonSlug === weakDomain)]
      .sort((a, b) => (attemptCounts.get(a.id) ?? 0) - (attemptCounts.get(b.id) ?? 0))[0] ?? professorPrompts[0];
    const openDomainMistakes = mistakes.filter((mistake) => mistake.status === "open" && mistake.lessonSlug === weakDomain).length;
    const professorReason = openDomainMistakes
      ? `${openDomainMistakes} open ${weakDomain === "cardiac-cycle" ? "cardiac-cycle" : "cardiac-output"} correction${openDomainMistakes === 1 ? "" : "s"} made this the highest-value explanation.`
      : cycleRisk === outputRisk
        ? "No stronger risk signal exists yet, so Professor Mode starts with the earliest prerequisite."
        : `${weakDomain === "cardiac-cycle" ? "Cardiac-cycle" : "Cardiac-output"} evidence is currently weaker across diagnostics, confidence, and saved mistakes.`;

    const progressAttempts = activities.filter((attempt) => attempt.activityType === "cumulative_progress_test");
    const latestProgressAttempt = progressAttempts[0];
    const latestProgressDetails = latestProgressAttempt ? parseDetails(latestProgressAttempt.detailsJson) : null;
    const nextTestAt = latestProgressDetails?.nextTestAt ?? null;
    const now = new Date().toISOString();

    return Response.json({
      nodes,
      professor: { prompt: adaptivePrompt, reason: professorReason, attempts: professorAttempts.length, weakDomain },
      progressTest: {
        ...cardiovascularProgressTest,
        attempts: progressAttempts.length,
        due: !nextTestAt || nextTestAt <= now,
        nextTestAt,
        latest: latestProgressAttempt ? { correctCount: latestProgressAttempt.correctCount, totalCount: latestProgressAttempt.totalCount, completedAt: latestProgressAttempt.completedAt, domainScores: latestProgressDetails?.domainScores ?? {} } : null,
      },
      summary: {
        foundationsComplete: ["cardiac-cycle", "cardiac-output"].filter((slug) => progressMap.get(slug)?.status === "complete").length,
        clinicalObjectives: cardiovascularPathwayNodes.filter((node) => node.kind === "clinical").length,
        sourceApproved: cardiovascularPathwayNodes.filter((node) => node.kind === "clinical" && reviewMap.get(node.id) === "approved").length,
        lessonReady: cardiovascularPathwayNodes.filter((node) => node.kind === "clinical" && draftMap.has(node.id)).length,
        professorAttempts: professorAttempts.length,
        progressTests: progressAttempts.length,
      },
    });
  } catch {
    return Response.json({ error: "The cardiovascular pathway could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as {
      action?: string;
      promptId?: string;
      response?: string;
      confidence?: Confidence;
      hintLevel?: number;
      testId?: string;
      answers?: Record<string, number>;
      confidences?: Record<string, Confidence>;
    };
    await ensureVitaeSchema();

    if (body.action === "professor") {
      const prompt = professorPrompts.find((item) => item.id === body.promptId);
      const response = body.response?.trim().slice(0, 3000) ?? "";
      const confidence = body.confidence;
      const hintLevel = Math.max(0, Math.min(3, Math.trunc(body.hintLevel ?? 0)));
      if (!prompt || response.length < 10 || !confidence || !["low", "medium", "high"].includes(confidence)) {
        return Response.json({ error: "Write your explanation and record your confidence before checking it." }, { status: 400 });
      }
      const scored = scoreProfessorResponse(prompt, response);
      const saved = await saveProfessorAttempt({ ownerId, promptId: prompt.id, lessonSlug: prompt.lessonSlug, prompt: prompt.prompt, response, confidence, hintLevel, ...scored, modelAnswer: prompt.modelAnswer, sourceLabel: prompt.sourceLabel });
      return Response.json({ ...saved, modelAnswer: prompt.modelAnswer, sourceLabel: prompt.sourceLabel, href: prompt.href, note: "Checklist scoring supports reflection; it does not replace human review of equivalent wording." }, { status: 201 });
    }

    if (body.action === "progress_test") {
      const answers = body.answers ?? {};
      const confidences = body.confidences ?? {};
      const invalid = body.testId !== cardiovascularProgressTest.id || cardiovascularProgressTest.questions.some((question) => {
        const answer = answers[question.id];
        return !Number.isInteger(answer) || Number(answer) < 0 || Number(answer) >= question.options.length || !["low", "medium", "high"].includes(confidences[question.id] ?? "");
      });
      if (invalid) return Response.json({ error: "Answer every question and record confidence before finishing the progress test." }, { status: 400 });

      const domainScores = Object.fromEntries((["cardiac-cycle", "cardiac-output"] as const).map((domain) => {
        const items = cardiovascularProgressTest.questions.filter((question) => question.domain === domain);
        const correct = items.filter((question) => answers[question.id] === question.correctOption).length;
        return [domain, Math.round(correct / items.length * 100)];
      }));
      const tierScores = Object.fromEntries((["repair", "retention", "transfer"] as const).map((tier) => {
        const items = cardiovascularProgressTest.questions.filter((question) => question.tier === tier);
        const correct = items.filter((question) => answers[question.id] === question.correctOption).length;
        return [tier, Math.round(correct / items.length * 100)];
      }));
      const highConfidenceWrong = cardiovascularProgressTest.questions.filter((question) => answers[question.id] !== question.correctOption && confidences[question.id] === "high").length;
      const correctCount = cardiovascularProgressTest.questions.filter((question) => answers[question.id] === question.correctOption).length;
      const percent = Math.round(correctCount / cardiovascularProgressTest.questions.length * 100);
      const intervalDays = highConfidenceWrong || percent < 70 ? 1 : percent < 85 ? 3 : 7;
      const nextTestAt = new Date(Date.now() + intervalDays * 86_400_000).toISOString();
      const saved = await saveLearningAttempt({
        ownerId,
        activityType: "cumulative_progress_test",
        activityId: cardiovascularProgressTest.id,
        subject: "Internal Medicine I",
        system: "Cardiovascular",
        answers,
        items: cardiovascularProgressTest.questions,
        extra: { confidence: confidences, domainScores, tierScores, highConfidenceWrong, intervalDays, nextTestAt },
      });
      return Response.json({ ...saved, domainScores, tierScores, highConfidenceWrong, intervalDays, nextTestAt }, { status: 201 });
    }

    return Response.json({ error: "Choose Professor Mode or the cumulative progress test." }, { status: 400 });
  } catch {
    return Response.json({ error: "The cardiovascular learning activity could not be saved." }, { status: 500 });
  }
}
