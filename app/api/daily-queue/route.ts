import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, assessmentAttempts, clinicalReasoningProgress, dailyQueueActions, generatedQuestions, learningActivityAttempts, lessonDrafts, lessonProgress, misconceptionRepairs, mistakeNotebook, recallReviews, recallReviewSignals } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { findCoverageObjective } from "@/lib/subject-alignments";

type DailyTask = { key: string; category: "lesson" | "recall" | "mistake" | "practice" | "revision"; title: string; reason: string; href: string; action: string; minutes: number; priority: number; evidence: string };

function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function taskOrder(a: DailyTask, b: DailyTask) {
  return b.priority - a.priority || a.key.localeCompare(b.key);
}

function misconceptionKey(mistake: typeof mistakeNotebook.$inferSelect) {
  const label = mistake.sourceLabel.split("·").map((part) => part.trim()).filter(Boolean).slice(0, 2).join(" · ") || mistake.lessonSlug;
  return `${mistake.lessonSlug}:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100)}`;
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const dateKey = indiaDateKey();
    const [progress, reviews, signals, mistakes, attempts, activities, drafts, alignmentDecisions, questions, reasoningProgress, repairs, actions] = await Promise.all([
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)),
      getDb().select().from(recallReviewSignals).where(eq(recallReviewSignals.ownerId, ownerId)),
      getDb().select().from(mistakeNotebook).where(eq(mistakeNotebook.ownerId, ownerId)),
      getDb().select().from(assessmentAttempts).where(eq(assessmentAttempts.ownerId, ownerId)),
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)),
      getDb().select().from(lessonDrafts).where(eq(lessonDrafts.ownerId, ownerId)),
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(generatedQuestions).where(eq(generatedQuestions.ownerId, ownerId)),
      getDb().select().from(clinicalReasoningProgress).where(eq(clinicalReasoningProgress.ownerId, ownerId)),
      getDb().select().from(misconceptionRepairs).where(eq(misconceptionRepairs.ownerId, ownerId)),
      getDb().select().from(dailyQueueActions).where(and(eq(dailyQueueActions.ownerId, ownerId), eq(dailyQueueActions.dateKey, dateKey))),
    ]);
    const now = new Date().toISOString();
    const actionMap = new Map(actions.map((action) => [action.taskKey, action.status]));
    const signalMap = new Map(signals.map((signal) => [`${signal.lessonSlug}:${signal.questionKey}`, signal]));
    const dueMistakes = mistakes.filter((mistake) => mistake.status === "open" && mistake.nextReviewAt <= now);
    const dueReviews = reviews.filter((review) => review.dueAt <= now);
    const approvedIds = new Set(alignmentDecisions.filter((review) => review.decision === "approved").map((review) => review.alignmentId));
    const approvedQuestions = questions.filter((question) => question.status === "approved");
    const tasks: DailyTask[] = [];

    if (dueMistakes.length) tasks.push({ key: "mistakes-due", category: "mistake", title: `Correct ${dueMistakes.length} due ${dueMistakes.length === 1 ? "mistake" : "mistakes"}`, reason: "An unresolved incorrect concept has priority over adding new material.", href: "/mistakes", action: "Open correction notebook", minutes: Math.min(20, Math.max(5, dueMistakes.length * 5)), priority: 110 + dueMistakes.length, evidence: `${dueMistakes.length} open correction ${dueMistakes.length === 1 ? "is" : "are"} due` });

    const incorrectCounts = new Map<string, number>();
    for (const activity of activities) {
      try {
        const details = JSON.parse(activity.detailsJson) as { results?: Array<{ questionId?: string; correct?: boolean }> };
        for (const result of details.results ?? []) if (result.questionId && result.correct === false) incorrectCounts.set(result.questionId, (incorrectCounts.get(result.questionId) ?? 0) + 1);
      } catch { /* Ignore malformed legacy attempt evidence. */ }
    }
    const misconceptionSignals = new Map<string, { count: number; latest: string }>();
    for (const mistake of mistakes.filter((item) => item.status === "open")) {
      const key = misconceptionKey(mistake);
      const signal = signals.find((item) => item.lessonSlug === mistake.lessonSlug && item.questionKey === mistake.questionKey);
      const current = misconceptionSignals.get(key) ?? { count: 0, latest: "" };
      const count = Math.max(1, incorrectCounts.get(mistake.questionKey) ?? 0) + (signal?.lapseCount ?? 0);
      const latest = [current.latest, mistake.updatedAt, signal?.updatedAt ?? ""].sort().at(-1) ?? "";
      misconceptionSignals.set(key, { count: current.count + count, latest });
    }
    const repairMap = new Map(repairs.map((repair) => [repair.conceptKey, repair.updatedAt]));
    const misconception = [...misconceptionSignals.entries()].filter(([conceptKey, signal]) => signal.count >= 2 && (repairMap.get(conceptKey) ?? "") < signal.latest).sort((a, b) => b[1].count - a[1].count)[0];
    if (misconception) tasks.push({ key: `misconception-${misconception[0].replace(/[^a-z0-9-]+/g, "-")}`, category: "mistake", title: "Repair a repeated misconception", reason: "Multiple wrong answers or recall lapses now point to the same source-labelled concept pattern.", href: "/misconceptions", action: "Open corrective micro-lesson", minutes: 8, priority: 108 + misconception[1].count, evidence: `${misconception[1].count} linked error signals` });

    if (dueReviews.length) {
      const averageRisk = Math.round(dueReviews.reduce((sum, review) => sum + (signalMap.get(`${review.lessonSlug}:${review.questionKey}`)?.forgettingScore ?? 25), 0) / dueReviews.length);
      tasks.push({ key: "recall-due", category: "recall", title: `Retrieve ${dueReviews.length} due ${dueReviews.length === 1 ? "card" : "cards"}`, reason: `The cards are due now; their average forgetting risk is ${averageRisk}%.`, href: "/review", action: "Start adaptive recall", minutes: Math.min(20, Math.max(5, dueReviews.length * 2)), priority: 100 + Math.round(averageRisk / 5), evidence: `${averageRisk}% average forgetting risk` });
    }

    const staticLessons = [
      { slug: "cardiac-cycle", title: "Cardiac cycle", href: "/learn/cardiovascular/cardiac-cycle", objectiveId: "cv-1-4" },
      { slug: "cardiac-output", title: "Cardiac output", href: "/learn/cardiovascular/cardiac-output", objectiveId: "cv-1-4" },
    ];
    const progressMap = new Map(progress.map((item) => [item.lessonSlug, item]));
    const lessonCandidates = [
      ...staticLessons,
      ...drafts.filter((draft) => approvedIds.has(draft.alignmentId)).map((draft) => ({ slug: draft.lessonSlug, title: draft.title, href: `/coverage#objective-${draft.alignmentId}`, objectiveId: draft.alignmentId })),
    ].filter((lesson, index, all) => all.findIndex((candidate) => candidate.slug === lesson.slug) === index).map((lesson) => {
      const item = progressMap.get(lesson.slug);
      const ratio = item ? item.completedPoints / Math.max(1, item.totalPoints) : 0;
      return { ...lesson, ratio, complete: item?.status === "complete" };
    }).filter((lesson) => !lesson.complete).sort((a, b) => a.ratio - b.ratio || a.slug.localeCompare(b.slug));
    const lesson = lessonCandidates[0];
    if (lesson) {
      const objective = findCoverageObjective(lesson.objectiveId);
      tasks.push({ key: `lesson-${lesson.slug}`, category: "lesson", title: lesson.ratio ? `Continue ${lesson.title}` : `Begin ${lesson.title}`, reason: lesson.ratio ? `This is your least-complete active lesson at ${Math.round(lesson.ratio * 100)}%.` : "This is the next approved foundation or source-linked lesson without learning evidence.", href: lesson.href, action: lesson.ratio ? "Continue lesson" : "Open lesson path", minutes: 20, priority: 82 - Math.round(lesson.ratio * 20), evidence: objective ? `${objective.subject} · ${objective.system}` : "Approved learning route" });
    }

    if (approvedQuestions.length) tasks.push({ key: "approved-questions", category: "practice", title: `Use ${Math.min(approvedQuestions.length, 5)} approved source questions`, reason: "These questions passed the human review gate and retain their exact source pages.", href: "/question-studio", action: "Open approved bank", minutes: Math.min(20, Math.max(8, approvedQuestions.length * 3)), priority: 72, evidence: `${approvedQuestions.length} approved source-backed ${approvedQuestions.length === 1 ? "question" : "questions"}` });

    const reasoningGroups = new Map<string, number>();
    for (const stage of reasoningProgress.filter((item) => item.status === "complete")) reasoningGroups.set(stage.objectiveId, (reasoningGroups.get(stage.objectiveId) ?? 0) + 1);
    const partialReasoning = [...reasoningGroups.entries()].filter(([, count]) => count > 0 && count < 6).sort((a, b) => b[1] - a[1])[0];
    if (partialReasoning) {
      const objective = findCoverageObjective(partialReasoning[0]);
      tasks.push({ key: `reasoning-${partialReasoning[0]}`, category: "practice", title: `Continue the ${objective?.system ?? "clinical"} reasoning ladder`, reason: "A source-backed clinical chain is partly complete; finishing the next link is more valuable than starting another isolated activity.", href: `/reasoning-ladder?objective=${partialReasoning[0]}`, action: "Continue reasoning", minutes: 10, priority: 84, evidence: `${partialReasoning[1]} of 6 reasoning stages complete` });
    }

    const latestAttempt = attempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
    const accuracy = latestAttempt ? Math.round(latestAttempt.correctCount / Math.max(1, latestAttempt.totalCount) * 100) : null;
    tasks.push({ key: "revision-check", category: "revision", title: accuracy === null ? "Establish today’s assessment baseline" : accuracy < 80 ? `Repair the ${100 - accuracy}% assessment gap` : "Run a short integration check", reason: accuracy === null ? "No saved assessment can yet calibrate today’s revision." : accuracy < 80 ? `Your latest assessment accuracy was ${accuracy}%; revision should target the missed concepts.` : `Your latest assessment was ${accuracy}%; a short check can confirm retention.`, href: "/assessment", action: accuracy === null ? "Start baseline" : "Open assessment", minutes: 12, priority: accuracy === null ? 78 : accuracy < 80 ? 88 : 55, evidence: accuracy === null ? "No assessment evidence yet" : `${accuracy}% latest accuracy` });

    const queue = tasks.sort(taskOrder).slice(0, 5).map((task, index) => ({ ...task, order: index + 1, status: actionMap.get(task.key) ?? "pending" }));
    return Response.json({ dateKey, queue, summary: { total: queue.length, completed: queue.filter((task) => task.status === "completed").length, pending: queue.filter((task) => task.status !== "completed").length, minutes: queue.filter((task) => task.status !== "completed").reduce((sum, task) => sum + task.minutes, 0), dueReviews: dueReviews.length, dueMistakes: dueMistakes.length } });
  } catch { return Response.json({ error: "Today’s adaptive learning queue could not be prepared." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { taskKey?: string; status?: string };
    const taskKey = body.taskKey?.trim().slice(0, 160) ?? "";
    const status = body.status?.trim() ?? "";
    if (!taskKey || !/^[a-z0-9-]+$/.test(taskKey) || !new Set(["pending", "completed"]).has(status)) return Response.json({ error: "Choose a valid daily task and status." }, { status: 400 });
    await ensureVitaeSchema();
    const dateKey = indiaDateKey();
    const updatedAt = new Date().toISOString();
    const [action] = await getDb().insert(dailyQueueActions).values({ id: crypto.randomUUID(), ownerId, dateKey, taskKey, status, updatedAt }).onConflictDoUpdate({ target: [dailyQueueActions.ownerId, dailyQueueActions.dateKey, dailyQueueActions.taskKey], set: { status, updatedAt } }).returning();
    return Response.json({ action });
  } catch { return Response.json({ error: "The daily task could not be updated." }, { status: 500 }); }
}
