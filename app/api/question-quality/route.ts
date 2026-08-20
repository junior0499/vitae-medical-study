import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { assessmentAttempts, generatedQuestions, learningActivityAttempts, learningVersions, questionQualityReviews } from "@/db/schema";
import { ensureVitaeSchema } from "@/db/runtime-schema";
import { getCurrentOwnerId, unauthorizedResponse } from "@/lib/current-user";
import { buildQuestionQuality, qualityQuestionCatalog } from "@/lib/question-quality";

const decisions = new Set(["active", "review_needed", "retired"]);

export async function GET(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    await ensureVitaeSchema();
    const [activities, assessments, reviews, generated] = await Promise.all([
      getDb().select().from(learningActivityAttempts).where(eq(learningActivityAttempts.ownerId, ownerId)),
      getDb().select().from(assessmentAttempts).where(eq(assessmentAttempts.ownerId, ownerId)),
      getDb().select().from(questionQualityReviews).where(eq(questionQualityReviews.ownerId, ownerId)),
      getDb().select().from(generatedQuestions).where(eq(generatedQuestions.ownerId, ownerId)),
    ]);
    return Response.json(buildQuestionQuality({ activities, assessments, reviews, generated }));
  } catch { return Response.json({ error: "Question-quality evidence could not be loaded." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const ownerId = getCurrentOwnerId(request);
  if (!ownerId) return unauthorizedResponse();
  try {
    const body = await request.json() as { questionKey?: string; decision?: string; reviewerNote?: string };
    const questionKey = body.questionKey?.trim() ?? "";
    const decision = body.decision?.trim() ?? "";
    await ensureVitaeSchema();
    const generated = await getDb().select().from(generatedQuestions).where(eq(generatedQuestions.ownerId, ownerId));
    const known = qualityQuestionCatalog.find((item) => item.id === questionKey);
    const generatedItem = generated.find((item) => item.id === questionKey);
    if ((!known && !generatedItem) || !decisions.has(decision)) return Response.json({ error: "Choose a valid question and review decision." }, { status: 400 });
    const reviewerNote = body.reviewerNote?.trim().slice(0, 2000) ?? "";
    const sourceKind = known?.sourceKind ?? "Approved-source draft";
    const updatedAt = new Date().toISOString();
    await getDb().insert(questionQualityReviews).values({ id: crypto.randomUUID(), ownerId, questionKey, sourceKind, decision, flagsJson: "[]", reviewerNote, updatedAt }).onConflictDoUpdate({
      target: [questionQualityReviews.ownerId, questionQualityReviews.questionKey],
      set: { sourceKind, decision, reviewerNote, updatedAt },
    });
    if (generatedItem && decision === "retired") await getDb().update(generatedQuestions).set({ status: "changes_requested", reviewerNote: reviewerNote || "Retired after individual question-quality review.", updatedAt }).where(and(eq(generatedQuestions.ownerId, ownerId), eq(generatedQuestions.id, generatedItem.id)));
    await getDb().insert(learningVersions).values({ id: crypto.randomUUID(), ownerId, entityType: "question_quality", entityKey: questionKey, action: decision, summary: `${sourceKind} question marked ${decision.replaceAll("_", " ")}`, payloadJson: JSON.stringify({ questionKey, sourceKind, decision, reviewerNote }), createdAt: updatedAt });
    return Response.json({ questionKey, decision, reviewerNote, updatedAt, note: "This individual human decision does not alter the source passage or approve a generated question." });
  } catch { return Response.json({ error: "The question review could not be saved." }, { status: 500 }); }
}
