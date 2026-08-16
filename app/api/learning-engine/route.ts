import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, learningActivityAttempts, lessonProgress, mistakeNotebook, recallReviews, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { learningGraph } from "@/lib/learning-engine";

type Recommendation = { kind: string; eyebrow: string; title: string; reason: string; href: string; action: string };

function parseDetails(value: string) {
  try { return JSON.parse(value) as { domainScores?: Record<string, number> }; } catch { return {}; }
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [progress, activities, mistakes, reviews, documents, alignments] = await Promise.all([
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)),
      getDb().select().from(mistakeNotebook).where(eq(mistakeNotebook.ownerId, ownerId)),
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)),
      getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
    ]);
    const diagnostics = activities.filter((item) => item.activityType === "diagnostic").sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const cases = activities.filter((item) => item.activityType === "clinical_case");
    const visuals = activities.filter((item) => item.activityType === "visual_lab");
    const openMistakes = mistakes.filter((item) => item.status === "open");
    const dueReviews = reviews.filter((item) => item.dueAt <= new Date().toISOString());
    const cycle = progress.find((item) => item.lessonSlug === "cardiac-cycle");
    const output = progress.find((item) => item.lessonSlug === "cardiac-output");
    const latestDiagnostic = diagnostics[0];
    const scores = latestDiagnostic ? parseDetails(latestDiagnostic.detailsJson).domainScores ?? {} : {};
    let recommendation: Recommendation;
    if (!latestDiagnostic) recommendation = { kind: "diagnostic", eyebrow: "Find your starting point", title: "Take the cardiovascular diagnostic", reason: "No diagnostic evidence exists yet, so the engine cannot safely skip or prioritize foundations.", href: "/diagnostic", action: "Start diagnostic" };
    else if ((scores["cardiac-cycle"] ?? 0) < 75) recommendation = { kind: "lesson", eyebrow: "Foundation gap detected", title: "Repair the cardiac-cycle connection", reason: `Your latest cardiac-cycle diagnostic score is ${scores["cardiac-cycle"] ?? 0}%. Revisit pressure, valve, volume, and sound timing before more application.`, href: "/learn/cardiovascular/cardiac-cycle", action: "Open focused lesson" };
    else if ((scores["cardiac-output"] ?? 0) < 75) recommendation = { kind: "lesson", eyebrow: "Foundation gap detected", title: "Repair cardiac-output reasoning", reason: `Your latest cardiac-output diagnostic score is ${scores["cardiac-output"] ?? 0}%. Strengthen the HR × SV relationship and loading determinants next.`, href: "/learn/cardiovascular/cardiac-output", action: "Open focused lesson" };
    else if (openMistakes.length) recommendation = { kind: "mistake", eyebrow: "Correction before expansion", title: `Resolve ${openMistakes.length} open ${openMistakes.length === 1 ? "mistake" : "mistakes"}`, reason: "The foundations are diagnostic-ready, but unresolved incorrect concepts should be corrected before a new case.", href: "/mistakes", action: "Open notebook" };
    else if (dueReviews.length) recommendation = { kind: "review", eyebrow: "Memory is due", title: `Review ${dueReviews.length} due ${dueReviews.length === 1 ? "card" : "cards"}`, reason: "Scheduled retrieval now has higher value than adding another new activity.", href: "/review", action: "Start review" };
    else if (cycle?.status !== "complete") recommendation = { kind: "lesson", eyebrow: "Complete the prerequisite", title: "Finish the cardiac cycle", reason: "The case and visual lab depend on a complete pressure-and-valve sequence.", href: "/learn/cardiovascular/cardiac-cycle", action: "Continue lesson" };
    else if (output?.status !== "complete") recommendation = { kind: "lesson", eyebrow: "Complete the prerequisite", title: "Finish cardiac output", reason: "Forward-flow cases require the HR × SV relationship and stroke-volume determinants.", href: "/learn/cardiovascular/cardiac-output", action: "Continue lesson" };
    else if (!cases.length) recommendation = { kind: "case", eyebrow: "Apply the foundations", title: "Work through a progressive case", reason: "Your current evidence supports moving from isolated concepts to sequential clinical reasoning.", href: "/cases", action: "Open case" };
    else if (!visuals.length) recommendation = { kind: "visual", eyebrow: "Train pattern recognition", title: "Enter the visual interpretation lab", reason: "You have lesson and case evidence; now practise reading pressure and flow patterns.", href: "/visual-lab", action: "Open visual lab" };
    else recommendation = { kind: "assessment", eyebrow: "Integrate and verify", title: "Take the timed cardiovascular check", reason: "Diagnostic, lesson, case, and visual evidence are present. A timed assessment is the next integration step.", href: "/assessment", action: "Start assessment" };

    const graph = learningGraph.map((node) => ({
      ...node,
      state: node.id === "source" ? (documents.length && alignments.some((item) => item.decision === "approved") ? "ready" : "mapped")
        : node.id === "lesson" ? (cycle || output ? "active" : "ready")
        : node.id === "diagnostic" ? (diagnostics.length ? "evidence" : "ready")
        : node.id === "case" ? (cases.length ? "evidence" : "ready")
        : node.id === "visual" ? (visuals.length ? "evidence" : "ready")
        : node.id === "correction" ? (openMistakes.length || reviews.length ? "active" : "ready")
        : node.id === "mastery" ? "active" : "mapped",
    }));
    return Response.json({ recommendation, graph, evidence: { diagnostics: diagnostics.length, cases: cases.length, visuals: visuals.length, openMistakes: openMistakes.length, dueReviews: dueReviews.length, sourceDocuments: documents.length, approvedMappings: alignments.filter((item) => item.decision === "approved").length }, latestDiagnostic: latestDiagnostic ? { score: Math.round(latestDiagnostic.correctCount / latestDiagnostic.totalCount * 100), domainScores: scores, completedAt: latestDiagnostic.completedAt } : null });
  } catch { return Response.json({ error: "The learning engine could not calculate your next step." }, { status: 500 }); }
}

