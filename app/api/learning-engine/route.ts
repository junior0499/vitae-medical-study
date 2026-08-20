import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { alignmentReviews, evidenceFreshnessReviews, learningActivityAttempts, lessonProgress, mistakeNotebook, questionQualityReviews, recallReviews, studyDocuments } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { learningGraph } from "@/lib/learning-engine";

type Recommendation = { kind: string; eyebrow: string; title: string; reason: string; href: string; action: string };

function parseDetails(value: string) {
  try { return JSON.parse(value) as { domainScores?: Record<string, number>; confidence?: Record<string, string>; results?: Array<{ questionId: string; correct: boolean }> }; } catch { return {}; }
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [progress, activities, mistakes, reviews, documents, alignments, qualityReviews, freshnessReviews] = await Promise.all([
      getDb().select().from(lessonProgress).where(eq(lessonProgress.ownerId, ownerId)),
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)),
      getDb().select().from(mistakeNotebook).where(eq(mistakeNotebook.ownerId, ownerId)),
      getDb().select().from(recallReviews).where(eq(recallReviews.ownerId, ownerId)),
      getDb().select().from(studyDocuments).where(eq(studyDocuments.ownerId, ownerId)),
      getDb().select().from(alignmentReviews).where(eq(alignmentReviews.ownerId, ownerId)),
      getDb().select().from(questionQualityReviews).where(eq(questionQualityReviews.ownerId, ownerId)),
      getDb().select().from(evidenceFreshnessReviews).where(eq(evidenceFreshnessReviews.ownerId, ownerId)),
    ]);
    const diagnostics = activities.filter((item) => item.activityType === "diagnostic").sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const cases = activities.filter((item) => item.activityType === "clinical_case");
    const encounters = activities.filter((item) => item.activityType === "clinical_encounter");
    const visuals = activities.filter((item) => item.activityType === "visual_lab");
    const interleaved = activities.filter((item) => item.activityType === "interleaved_review");
    const professorDialogues = activities.filter((item) => item.activityType === "professor_dialogue");
    const cumulativeTests = activities.filter((item) => item.activityType === "cumulative_progress_test");
    const vivas = activities.filter((item) => item.activityType === "oral_viva");
    const voiceTeachBacks = activities.filter((item) => item.activityType === "voice_teach_back");
    const highConfidenceWrong = interleaved.reduce((count, item) => {
      const details = parseDetails(item.detailsJson);
      return count + (details.results ?? []).filter((result) => !result.correct && details.confidence?.[result.questionId] === "high").length;
    }, 0);
    const openMistakes = mistakes.filter((item) => item.status === "open");
    const dueReviews = reviews.filter((item) => item.dueAt <= new Date().toISOString());
    const today = new Date().toISOString().slice(0, 10);
    const dueEvidence = freshnessReviews.filter((item) => item.decision === "superseded" || item.decision === "verified_current" && item.reviewDueAt && item.reviewDueAt <= today);
    const questionReviews = qualityReviews.filter((item) => item.decision === "review_needed");
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
    else if (!professorDialogues.length) recommendation = { kind: "professor", eyebrow: "Explain before expanding", title: "Teach the weakest mechanism back", reason: "Both live foundations are complete. Professor Mode 2.0 can now test whether the causal links survive without answer options.", href: "/cardiovascular-pathway#professor-2", action: "Start teach-back" };
    else if (!cases.length) recommendation = { kind: "case", eyebrow: "Apply the foundations", title: "Work through a progressive case", reason: "Your current evidence supports moving from isolated concepts to sequential clinical reasoning.", href: "/cases", action: "Open case" };
    else if (!encounters.length) recommendation = { kind: "encounter", eyebrow: "Move into the encounter", title: "Complete the six-stage clinical simulation", reason: "You have initial case evidence. Now practise history-to-communication reasoning and prove that you stop at an unsupported management decision.", href: "/clinical-encounter", action: "Start encounter" };
    else if (!visuals.length) recommendation = { kind: "visual", eyebrow: "Train pattern recognition", title: "Enter the visual interpretation lab", reason: "You have lesson and case evidence; now practise reading pressure and flow patterns.", href: "/visual-lab", action: "Open visual lab" };
    else if (!interleaved.length) recommendation = { kind: "interleaved", eyebrow: "Make memory choose", title: "Mix cardiac cycle with cardiac output", reason: "You have isolated application evidence. Interleaving now tests whether you can select the right mechanism without a chapter cue.", href: "/interleaved", action: "Start mixed review" };
    else if (!cumulativeTests.length) recommendation = { kind: "progress-test", eyebrow: "Prove retention", title: "Take the cumulative cardiovascular test", reason: "The isolated and mixed activities are present. Retest them together and let stability set the next interval.", href: "/cardiovascular-pathway#progress-test", action: "Start progress test" };
    else if (highConfidenceWrong) recommendation = { kind: "confidence", eyebrow: "Hidden certainty risk", title: `Correct ${highConfidenceWrong} confident ${highConfidenceWrong === 1 ? "error" : "errors"}`, reason: "A confident incorrect answer has higher correction priority than more new questions.", href: "/confidence", action: "Calibrate confidence" };
    else if (dueEvidence.length) recommendation = { kind: "freshness", eyebrow: "Evidence check is due", title: `Review ${dueEvidence.length} source ${dueEvidence.length === 1 ? "scope" : "scopes"}`, reason: "A superseded or due source should be inspected before it supports more clinical learning.", href: "/evidence-governance", action: "Review evidence" };
    else if (questionReviews.length) recommendation = { kind: "question-quality", eyebrow: "Item review is waiting", title: `Inspect ${questionReviews.length} marked ${questionReviews.length === 1 ? "question" : "questions"}`, reason: "These questions were individually marked for review and should be resolved before expanding the bank.", href: "/question-quality", action: "Open quality lab" };
    else if (!vivas.length) recommendation = { kind: "viva", eyebrow: "Explain without options", title: "Take the cardiovascular oral viva", reason: "Your recognition evidence is ready to be tested as a spoken or typed mechanism explanation.", href: "/viva", action: "Start oral viva" };
    else if (!voiceTeachBacks.length) recommendation = { kind: "voice", eyebrow: "Repair the spoken chain", title: "Complete a focused voice teach-back", reason: "Your broad viva is saved. Now explain one causal chain and let each missing reasoning link enter targeted correction.", href: "/voice-teach-back", action: "Teach it back" };
    else recommendation = { kind: "assessment", eyebrow: "Integrate and verify", title: "Take the timed cardiovascular check", reason: "Diagnostic, lesson, case, and visual evidence are present. A timed assessment is the next integration step.", href: "/assessment", action: "Start assessment" };

    const graph = learningGraph.map((node) => ({
      ...node,
      state: node.id === "source" ? (documents.length && alignments.some((item) => item.decision === "approved") ? "ready" : "mapped")
        : node.id === "pathway" ? "active"
        : node.id === "lesson" ? (cycle || output ? "active" : "ready")
        : node.id === "professor" ? (professorDialogues.length ? "evidence" : "ready")
        : node.id === "diagnostic" ? (diagnostics.length ? "evidence" : "ready")
        : node.id === "case" ? (cases.length ? "evidence" : "ready")
        : node.id === "encounter" ? (encounters.length ? "evidence" : "ready")
        : node.id === "visual" ? (visuals.length ? "evidence" : "ready")
        : node.id === "interleave" ? (interleaved.length ? "evidence" : "ready")
        : node.id === "progress-test" ? (cumulativeTests.length ? "evidence" : "ready")
        : node.id === "viva" ? (vivas.length ? "evidence" : "ready")
        : node.id === "voice" ? (voiceTeachBacks.length ? "evidence" : "ready")
        : node.id === "confidence" ? (interleaved.length ? (highConfidenceWrong ? "active" : "evidence") : "ready")
        : node.id === "blueprint" ? "ready"
        : node.id === "correction" ? (openMistakes.length || reviews.length ? "active" : "ready")
        : node.id === "question-quality" ? (questionReviews.length ? "active" : qualityReviews.length ? "evidence" : "ready")
        : node.id === "freshness" ? (dueEvidence.length ? "active" : freshnessReviews.length ? "evidence" : "ready")
        : node.id === "mastery" ? "active"
        : node.id === "outcomes" ? (activities.length ? "evidence" : "ready") : "mapped",
    }));
    return Response.json({ recommendation, graph, evidence: { diagnostics: diagnostics.length, cases: cases.length, encounters: encounters.length, visuals: visuals.length, interleaved: interleaved.length, professorDialogues: professorDialogues.length, cumulativeTests: cumulativeTests.length, vivas: vivas.length, voiceTeachBacks: voiceTeachBacks.length, highConfidenceWrong, openMistakes: openMistakes.length, dueReviews: dueReviews.length, dueEvidence: dueEvidence.length, questionReviews: questionReviews.length, sourceDocuments: documents.length, approvedMappings: alignments.filter((item) => item.decision === "approved").length }, latestDiagnostic: latestDiagnostic ? { score: Math.round(latestDiagnostic.correctCount / latestDiagnostic.totalCount * 100), domainScores: scores, completedAt: latestDiagnostic.completedAt } : null });
  } catch { return Response.json({ error: "The learning engine could not calculate your next step." }, { status: 500 }); }
}
