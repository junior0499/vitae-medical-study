import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningActivityAttempts, misconceptionRepairs, mistakeNotebook, recallReviewSignals } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";

type MistakeRow = typeof mistakeNotebook.$inferSelect;

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function conceptLabel(mistake: MistakeRow) {
  const parts = mistake.sourceLabel.split("·").map((part) => part.trim()).filter(Boolean);
  return parts.slice(0, 2).join(" · ") || mistake.lessonSlug.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function parseIncorrectQuestionCounts(attempts: Array<typeof learningActivityAttempts.$inferSelect>) {
  const counts = new Map<string, number>();
  for (const attempt of attempts) {
    try {
      const details = JSON.parse(attempt.detailsJson) as { results?: Array<{ questionId?: string; correct?: boolean }> };
      for (const result of details.results ?? []) if (result.questionId && result.correct === false) counts.set(result.questionId, (counts.get(result.questionId) ?? 0) + 1);
    } catch { /* Ignore malformed legacy evidence. */ }
  }
  return counts;
}

async function buildPatterns(ownerId: string) {
  const [mistakes, attempts, signals, repairs] = await Promise.all([
    getDb().select().from(mistakeNotebook).where(eq(mistakeNotebook.ownerId, ownerId)),
    getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)),
    getDb().select().from(recallReviewSignals).where(eq(recallReviewSignals.ownerId, ownerId)),
    getDb().select().from(misconceptionRepairs).where(eq(misconceptionRepairs.ownerId, ownerId)),
  ]);
  const incorrectCounts = parseIncorrectQuestionCounts(attempts);
  const repairMap = new Map(repairs.map((repair) => [repair.conceptKey, repair]));
  const groups = new Map<string, { conceptKey: string; label: string; lessonSlug: string; mistakes: MistakeRow[] }>();
  for (const mistake of mistakes) {
    const label = conceptLabel(mistake);
    const conceptKey = `${mistake.lessonSlug}:${slug(label)}`;
    const group = groups.get(conceptKey) ?? { conceptKey, label, lessonSlug: mistake.lessonSlug, mistakes: [] };
    group.mistakes.push(mistake); groups.set(conceptKey, group);
  }
  return [...groups.values()].map((group) => {
    const questionKeys = new Set(group.mistakes.map((mistake) => mistake.questionKey));
    const incorrectOccurrences = group.mistakes.reduce((sum, mistake) => sum + Math.max(1, incorrectCounts.get(mistake.questionKey) ?? 0), 0);
    const lapses = signals.filter((signal) => signal.lessonSlug === group.lessonSlug && questionKeys.has(signal.questionKey)).reduce((sum, signal) => sum + signal.lapseCount, 0);
    const openMistakes = group.mistakes.filter((mistake) => mistake.status === "open").length;
    const signalCount = incorrectOccurrences + lapses;
    const correctionAnchors = Array.from(new Set(group.mistakes.map((mistake) => mistake.correctedConcept))).slice(0, 3);
    const originalAnswers = Array.from(new Set(group.mistakes.map((mistake) => mistake.originalAnswer).filter(Boolean))).slice(0, 3);
    const sourceLabels = Array.from(new Set(group.mistakes.map((mistake) => mistake.sourceLabel))).slice(0, 4);
    const repair = repairMap.get(group.conceptKey);
    const latest = group.mistakes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return {
      conceptKey: group.conceptKey,
      label: group.label,
      lessonSlug: group.lessonSlug,
      level: signalCount >= 3 || (signalCount >= 2 && openMistakes) ? "repeated" : "watch",
      signalCount,
      incorrectOccurrences,
      lapses,
      distinctQuestions: questionKeys.size,
      openMistakes,
      riskScore: Math.min(100, 20 + incorrectOccurrences * 18 + lapses * 12 + openMistakes * 8),
      correctionAnchors,
      originalAnswers,
      sourceLabels,
      latestPrompt: latest?.prompt ?? "",
      repair: repair ? { status: repair.status, reflection: repair.reflection, completedAt: repair.completedAt } : null,
      microLesson: {
        notice: signalCount >= 2 ? `This concept has produced ${signalCount} error signals across questions and recall.` : "One error signal is being watched for recurrence.",
        correctAnchor: correctionAnchors[0] ?? "Return to the cited correction before continuing.",
        contrast: originalAnswers[0] ? `Previous answer: “${originalAnswers[0]}”` : "No previous answer text was retained.",
        retrievalPrompt: `Without copying the correction, explain ${group.label} in your own words and state what you previously confused.`,
      },
    };
  }).sort((a, b) => (a.level === b.level ? b.riskScore - a.riskScore : a.level === "repeated" ? -1 : 1));
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const patterns = await buildPatterns(ownerId);
    return Response.json({ patterns, summary: { repeated: patterns.filter((pattern) => pattern.level === "repeated").length, watched: patterns.filter((pattern) => pattern.level === "watch").length, completedRepairs: patterns.filter((pattern) => pattern.repair?.status === "completed").length }, method: "Repeated mistakes and recall lapses are grouped by lesson and source-labelled concept. A pattern is not a diagnosis of the learner; it is a review signal." });
  } catch { return Response.json({ error: "Misconception patterns could not be loaded." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { conceptKey?: string; reflection?: string };
    const conceptKey = String(body.conceptKey ?? "").trim().slice(0, 220);
    const reflection = String(body.reflection ?? "").trim().slice(0, 2000);
    if (!conceptKey || reflection.length < 20) return Response.json({ error: "Write at least 20 characters that correct the misconception in your own words." }, { status: 400 });
    await ensureVitaeSchema();
    const patterns = await buildPatterns(ownerId);
    const pattern = patterns.find((item) => item.conceptKey === conceptKey);
    if (!pattern) return Response.json({ error: "This misconception pattern is no longer present." }, { status: 404 });
    const completedAt = new Date().toISOString();
    const evidenceJson = JSON.stringify({ label: pattern.label, signalCount: pattern.signalCount, incorrectOccurrences: pattern.incorrectOccurrences, lapses: pattern.lapses, correctionAnchors: pattern.correctionAnchors, sourceLabels: pattern.sourceLabels });
    const [repair] = await getDb().insert(misconceptionRepairs).values({ id: crypto.randomUUID(), ownerId, conceptKey, lessonSlug: pattern.lessonSlug, reflection, evidenceJson, status: "completed", completedAt, updatedAt: completedAt }).onConflictDoUpdate({ target: [misconceptionRepairs.ownerId, misconceptionRepairs.conceptKey], set: { lessonSlug: pattern.lessonSlug, reflection, evidenceJson, status: "completed", completedAt, updatedAt: completedAt } }).returning();
    return Response.json({ repair }, { status: 201 });
  } catch { return Response.json({ error: "The corrective micro-lesson could not be saved." }, { status: 500 }); }
}
