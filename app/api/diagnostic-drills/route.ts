import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { diagnosticDrills, illnessScripts, learningActivityAttempts, mistakeNotebook, sourceLearningPacks } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { recordLearningVersion } from "@/lib/learning-history";
import { findCoverageObjective } from "@/lib/subject-alignments";

type Confidence = "low" | "medium" | "high";
type DifferentialPayload = { caseStem: string; correctScriptId: string; supportingFeatures: string[]; pertinentNegatives: string[]; alternativeArguments: string[]; missingInformation: string[]; sourceBoundary: string };
type CounterfactualPayload = { baseDrillId: string; changedFinding: string; correctScriptId: string; whyItChanges: string; requiredConcepts: string[]; sourceBoundary: string };
type AttemptAnswers = { diagnosisId?: string; supporting?: string; negatives?: string; alternatives?: string; missingInformation?: string; explanation?: string; confidence?: Confidence };

const decisions = new Set(["pending_review", "approved", "changes_requested"]);

function cleanText(value: unknown, max = 4000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanList(value: unknown, limit = 12) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/[\n,]+/);
  return Array.from(new Set(values.map((item) => cleanText(item, 280)).filter(Boolean))).slice(0, limit);
}

function parseArray(value: string) {
  try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []; } catch { return []; }
}

function parsePayload(value: string) {
  try { return JSON.parse(value) as DifferentialPayload | CounterfactualPayload; } catch { return null; }
}

function publicDrill(drill: typeof diagnosticDrills.$inferSelect) {
  return { ...drill, illnessScriptIds: parseArray(drill.illnessScriptIdsJson), sourcePackIds: parseArray(drill.sourcePackIdsJson), payload: parsePayload(drill.payloadJson) };
}

function tokens(value: string) {
  return Array.from(new Set(value.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [])).filter((token) => !["the", "and", "with", "from", "that", "this", "into", "than", "when"].includes(token));
}

function matchedPoints(expected: string[], response: string) {
  const responseTokens = new Set(tokens(response));
  return expected.filter((point) => {
    const pointTokens = tokens(point);
    return pointTokens.length > 0 && pointTokens.filter((token) => responseTokens.has(token)).length >= Math.max(1, Math.ceil(pointTokens.length * 0.7));
  });
}

async function approvedContext(ownerId: string, scriptIds: string[]) {
  const [scripts, packs] = await Promise.all([
    getDb().select().from(illnessScripts).where(eq(illnessScripts.ownerId, ownerId)),
    getDb().select().from(sourceLearningPacks).where(eq(sourceLearningPacks.ownerId, ownerId)),
  ]);
  const selectedScripts = scriptIds.map((id) => scripts.find((item) => item.id === id)).filter((item): item is typeof illnessScripts.$inferSelect => Boolean(item));
  const selectedPacks = selectedScripts.map((script) => packs.find((pack) => pack.id === script.sourcePackId)).filter((item): item is typeof sourceLearningPacks.$inferSelect => Boolean(item));
  const valid = selectedScripts.length === scriptIds.length && selectedScripts.every((item) => item.status === "approved") && selectedPacks.length === selectedScripts.length && selectedPacks.every((item) => item.status === "approved");
  return { valid, scripts: selectedScripts, packs: selectedPacks };
}

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [scripts, packs, drills, activities] = await Promise.all([
      getDb().select().from(illnessScripts).where(eq(illnessScripts.ownerId, ownerId)).orderBy(desc(illnessScripts.updatedAt)),
      getDb().select().from(sourceLearningPacks).where(eq(sourceLearningPacks.ownerId, ownerId)),
      getDb().select().from(diagnosticDrills).where(eq(diagnosticDrills.ownerId, ownerId)).orderBy(desc(diagnosticDrills.updatedAt)),
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)).orderBy(desc(learningActivityAttempts.completedAt)),
    ]);
    const packMap = new Map(packs.map((pack) => [pack.id, pack]));
    const approvedScripts = scripts.filter((script) => script.status === "approved" && packMap.get(script.sourcePackId)?.status === "approved").map((script) => ({ id: script.id, sourcePackId: script.sourcePackId, title: script.title, script: (() => { try { return JSON.parse(script.scriptJson) as Record<string, unknown>; } catch { return {}; } })(), sourceLabel: packMap.get(script.sourcePackId)?.sourceLabel ?? "Approved source", sourceQuote: packMap.get(script.sourcePackId)?.sourceQuote ?? "" }));
    const attempts = activities.filter((item) => ["diagnostic_justification", "counterfactual_transfer"].includes(item.activityType)).slice(0, 30).map((item) => ({ id: item.id, activityType: item.activityType, activityId: item.activityId, correctCount: item.correctCount, totalCount: item.totalCount, completedAt: item.completedAt, details: (() => { try { return JSON.parse(item.detailsJson) as Record<string, unknown>; } catch { return {}; } })() }));
    return Response.json({ scripts: approvedScripts, drills: drills.map(publicDrill), attempts, summary: { scripts: approvedScripts.length, differentials: drills.filter((item) => item.drillType === "differential").length, counterfactuals: drills.filter((item) => item.drillType === "counterfactual").length, approved: drills.filter((item) => item.status === "approved").length, attempts: attempts.length } });
  } catch {
    return Response.json({ error: "Diagnostic reasoning drills could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { action?: string; title?: string; illnessScriptIds?: string[]; prompt?: string; payload?: Record<string, unknown>; drillId?: string; answers?: AttemptAnswers };
    const action = body.action?.trim() ?? "";
    await ensureVitaeSchema();
    if (action === "attempt") {
      const drillId = body.drillId?.trim() ?? "";
      const [drill] = await getDb().select().from(diagnosticDrills).where(and(eq(diagnosticDrills.ownerId, ownerId), eq(diagnosticDrills.id, drillId))).limit(1);
      if (!drill || drill.status !== "approved") return Response.json({ error: "Choose an approved diagnostic drill." }, { status: 404 });
      const scriptIds = parseArray(drill.illnessScriptIdsJson);
      const context = await approvedContext(ownerId, scriptIds);
      if (!context.valid) return Response.json({ error: "A linked illness script or source pack is no longer approved.", code: "source_gate_changed" }, { status: 409 });
      const answers = body.answers ?? {};
      const confidence = answers.confidence;
      if (!answers.diagnosisId || !confidence || !["low", "medium", "high"].includes(confidence)) return Response.json({ error: "Choose a diagnosis and record your confidence before submitting." }, { status: 400 });
      const payload = parsePayload(drill.payloadJson);
      if (!payload) return Response.json({ error: "The drill needs reviewer repair before use." }, { status: 409 });
      let components: Array<{ label: string; score: number; maximum: number; matched: string[]; missing: string[] }>;
      let correction: string;
      let activityType: "diagnostic_justification" | "counterfactual_transfer";
      if (drill.drillType === "differential") {
        const differential = payload as DifferentialPayload;
        const groups = [
          { label: "Diagnosis", maximum: 40, expected: [differential.correctScriptId], response: answers.diagnosisId },
          { label: "Supporting findings", maximum: 20, expected: differential.supportingFeatures, response: cleanText(answers.supporting) },
          { label: "Pertinent negatives", maximum: 15, expected: differential.pertinentNegatives, response: cleanText(answers.negatives) },
          { label: "Alternatives", maximum: 15, expected: differential.alternativeArguments, response: cleanText(answers.alternatives) },
          { label: "Missing information", maximum: 10, expected: differential.missingInformation, response: cleanText(answers.missingInformation) },
        ];
        components = groups.map((group) => { const matched = group.label === "Diagnosis" ? (group.response === group.expected[0] ? group.expected : []) : matchedPoints(group.expected, group.response); const score = group.expected.length ? Math.round(matched.length / group.expected.length * group.maximum) : group.maximum; return { label: group.label, score, maximum: group.maximum, matched, missing: group.expected.filter((item) => !matched.includes(item)) }; });
        correction = `Expected supporting findings: ${differential.supportingFeatures.join("; ")}. Pertinent negatives: ${differential.pertinentNegatives.join("; ")}. Alternatives: ${differential.alternativeArguments.join("; ")}. Missing information: ${differential.missingInformation.join("; ")}.`;
        activityType = "diagnostic_justification";
      } else {
        const counterfactual = payload as CounterfactualPayload;
        const diagnosisMatched = answers.diagnosisId === counterfactual.correctScriptId;
        const concepts = matchedPoints(counterfactual.requiredConcepts, cleanText(answers.explanation));
        const rationaleTerms = cleanList(counterfactual.whyItChanges.split(/[.;]+/)).slice(0, 5);
        const rationaleMatched = matchedPoints(rationaleTerms, cleanText(answers.explanation));
        components = [
          { label: "Revised diagnosis", score: diagnosisMatched ? 50 : 0, maximum: 50, matched: diagnosisMatched ? [counterfactual.correctScriptId] : [], missing: diagnosisMatched ? [] : [counterfactual.correctScriptId] },
          { label: "Changed mechanism", score: counterfactual.requiredConcepts.length ? Math.round(concepts.length / counterfactual.requiredConcepts.length * 30) : 30, maximum: 30, matched: concepts, missing: counterfactual.requiredConcepts.filter((item) => !concepts.includes(item)) },
          { label: "Why the decision changes", score: rationaleTerms.length ? Math.round(rationaleMatched.length / rationaleTerms.length * 20) : 20, maximum: 20, matched: rationaleMatched, missing: rationaleTerms.filter((item) => !rationaleMatched.includes(item)) },
        ];
        correction = `Changed finding: ${counterfactual.changedFinding}. Reviewer rationale: ${counterfactual.whyItChanges}. Required concepts: ${counterfactual.requiredConcepts.join("; ")}.`;
        activityType = "counterfactual_transfer";
      }
      const score = components.reduce((sum, item) => sum + item.score, 0);
      const correct = score >= 70;
      const completedAt = new Date().toISOString();
      const objective = findCoverageObjective(context.packs[0]?.objectiveId ?? "");
      const sourceLabel = Array.from(new Set(context.packs.map((pack) => pack.sourceLabel))).join(" | ");
      const attemptId = crypto.randomUUID();
      const details = { drillId, drillType: drill.drillType, response: answers, confidence, score, components, sourcePackIds: context.packs.map((pack) => pack.id), results: [{ questionId: drill.id, correct, score, correction, sourceLabel }] };
      await getDb().insert(learningActivityAttempts).values({ id: attemptId, ownerId, activityType, activityId: drill.id, subject: objective?.subject ?? "Clinical learning", system: objective?.system ?? "Diagnostic reasoning", correctCount: correct ? 1 : 0, totalCount: 1, detailsJson: JSON.stringify(details), completedAt });
      const assessmentId = `${activityType}:${drill.id}`;
      if (correct) {
        await getDb().update(mistakeNotebook).set({ status: "resolved", updatedAt: completedAt }).where(and(eq(mistakeNotebook.ownerId, ownerId), eq(mistakeNotebook.assessmentId, assessmentId), eq(mistakeNotebook.questionKey, drill.id)));
      } else {
        const missing = components.flatMap((item) => item.missing);
        const values = { subject: objective?.subject ?? "Clinical learning", lessonSlug: context.packs[0]?.objectiveId ?? "diagnostic-reasoning", prompt: drill.prompt, originalAnswer: JSON.stringify(answers), correctedConcept: correction, reason: missing.length ? `Missing diagnostic links: ${missing.join(", ")}` : "The diagnostic justification needs another attempt.", sourceLabel, status: "open", nextReviewAt: new Date(Date.now() + 86_400_000).toISOString(), updatedAt: completedAt };
        await getDb().insert(mistakeNotebook).values({ id: crypto.randomUUID(), ownerId, assessmentId, questionKey: drill.id, ...values, createdAt: completedAt }).onConflictDoUpdate({ target: [mistakeNotebook.ownerId, mistakeNotebook.assessmentId, mistakeNotebook.questionKey], set: values });
      }
      return Response.json({ attemptId, score, correct, components, correction, sourceLabel, methodology: "Automatic phrase matching is formative and may miss equivalent clinical wording; ambiguous scoring requires human review." }, { status: 201 });
    }

    const title = cleanText(body.title, 240);
    const prompt = cleanText(body.prompt, 4000);
    const scriptIds = Array.from(new Set(Array.isArray(body.illnessScriptIds) ? body.illnessScriptIds.map((item) => cleanText(item, 120)).filter(Boolean) : []));
    if (!title || prompt.length < 20 || scriptIds.length < 2) return Response.json({ error: "Choose at least two approved illness scripts and write a complete prompt." }, { status: 400 });
    const context = await approvedContext(ownerId, scriptIds);
    if (!context.valid) return Response.json({ error: "Every linked illness script and source pack must be approved first.", code: "approved_scripts_required" }, { status: 409 });
    let drillType: "differential" | "counterfactual";
    let payload: DifferentialPayload | CounterfactualPayload;
    if (action === "create_differential") {
      const input = body.payload ?? {};
      payload = { caseStem: cleanText(input.caseStem, 4000), correctScriptId: cleanText(input.correctScriptId, 120), supportingFeatures: cleanList(input.supportingFeatures), pertinentNegatives: cleanList(input.pertinentNegatives), alternativeArguments: cleanList(input.alternativeArguments), missingInformation: cleanList(input.missingInformation), sourceBoundary: cleanText(input.sourceBoundary, 1000) };
      if (payload.caseStem.length < 20 || !scriptIds.includes(payload.correctScriptId) || !payload.supportingFeatures.length || !payload.pertinentNegatives.length || !payload.alternativeArguments.length || !payload.missingInformation.length) return Response.json({ error: "Complete the case, keyed diagnosis, supporting findings, pertinent negatives, alternative reasoning, and missing-information rubric." }, { status: 400 });
      drillType = "differential";
    } else if (action === "create_counterfactual") {
      const input = body.payload ?? {};
      payload = { baseDrillId: cleanText(input.baseDrillId, 120), changedFinding: cleanText(input.changedFinding, 1000), correctScriptId: cleanText(input.correctScriptId, 120), whyItChanges: cleanText(input.whyItChanges, 3000), requiredConcepts: cleanList(input.requiredConcepts), sourceBoundary: cleanText(input.sourceBoundary, 1000) };
      const [base] = await getDb().select().from(diagnosticDrills).where(and(eq(diagnosticDrills.ownerId, ownerId), eq(diagnosticDrills.id, payload.baseDrillId))).limit(1);
      if (!base || base.status !== "approved" || base.drillType !== "differential" || payload.changedFinding.length < 5 || !scriptIds.includes(payload.correctScriptId) || payload.whyItChanges.length < 10 || !payload.requiredConcepts.length) return Response.json({ error: "Choose an approved differential and complete the changed finding, revised diagnosis, rationale, and required concepts." }, { status: 400 });
      const baseScripts = parseArray(base.illnessScriptIdsJson);
      if (baseScripts.some((id) => !scriptIds.includes(id)) || scriptIds.some((id) => !baseScripts.includes(id))) return Response.json({ error: "Counterfactuals must reuse the exact approved differential pair." }, { status: 409 });
      drillType = "counterfactual";
    } else {
      return Response.json({ error: "Choose differential or counterfactual authoring." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const [saved] = await getDb().insert(diagnosticDrills).values({ id: crypto.randomUUID(), ownerId, drillType, title, illnessScriptIdsJson: JSON.stringify(scriptIds), sourcePackIdsJson: JSON.stringify(context.packs.map((pack) => pack.id)), prompt, payloadJson: JSON.stringify(payload), status: "pending_review", reviewerNote: "", createdAt: now, updatedAt: now }).returning();
    await recordLearningVersion({ ownerId, entityType: "diagnostic_drill", entityKey: saved.id, summary: `${title} · ${drillType} pending review`, payload: publicDrill(saved), createdAt: now });
    return Response.json({ drill: publicDrill(saved), reviewGate: "pending_review" }, { status: 201 });
  } catch {
    return Response.json({ error: "The diagnostic reasoning operation could not be completed." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { id?: string; status?: string; reviewerNote?: string };
    const id = body.id?.trim() ?? "";
    const status = body.status?.trim() ?? "";
    const reviewerNote = cleanText(body.reviewerNote, 2000);
    if (!id || !decisions.has(status)) return Response.json({ error: "Choose a valid drill and review decision." }, { status: 400 });
    await ensureVitaeSchema();
    const [drill] = await getDb().select().from(diagnosticDrills).where(and(eq(diagnosticDrills.ownerId, ownerId), eq(diagnosticDrills.id, id))).limit(1);
    if (!drill) return Response.json({ error: "Diagnostic drill not found." }, { status: 404 });
    if (status === "approved") {
      const context = await approvedContext(ownerId, parseArray(drill.illnessScriptIdsJson));
      if (!context.valid || !parsePayload(drill.payloadJson)) return Response.json({ error: "A linked source, illness script, or rubric changed. Repair the drill before approval." }, { status: 409 });
    }
    const updatedAt = new Date().toISOString();
    const [saved] = await getDb().update(diagnosticDrills).set({ status, reviewerNote, updatedAt }).where(and(eq(diagnosticDrills.ownerId, ownerId), eq(diagnosticDrills.id, id))).returning();
    await recordLearningVersion({ ownerId, entityType: "diagnostic_drill", entityKey: id, summary: `${saved.title} · ${status}`, payload: publicDrill(saved), createdAt: updatedAt });
    return Response.json({ drill: publicDrill(saved) });
  } catch {
    return Response.json({ error: "The diagnostic-drill review could not be saved." }, { status: 500 });
  }
}
