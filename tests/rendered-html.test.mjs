import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Poh-tah-toh medical study dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Poh-tah-toh — Medical Study Companion<\/title>/i);
  assert.match(html, /Poh-tah-toh/);
  assert.match(html, /cat-icon-192\.png/);
  assert.match(html, /Good morning, Nemesis\./);
  assert.match(html, /The cardiac cycle/);
  assert.match(html, /Today(?:&#x27;|&apos;|')s plan/);
  assert.match(html, /Atlas · Study companion/);
  assert.match(html, /Poh-tah-toh helps you learn medicine/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders the connected curriculum, adaptive engine, application tools, travel mode, and source library", async () => {
  const [learnResponse, coverageResponse, alignmentResponse, lessonResponse, outputResponse, reviewResponse, libraryResponse, assessmentResponse, mistakesResponse, routesResponse, mapsResponse, offlineResponse, diagnosticResponse, graphResponse, casesResponse, visualLabResponse] = await Promise.all([
    render("/learn"),
    render("/coverage"),
    render("/alignment"),
    render("/learn/cardiovascular/cardiac-cycle"),
    render("/learn/cardiovascular/cardiac-output"),
    render("/review"),
    render("/library"),
    render("/assessment"),
    render("/mistakes"),
    render("/routes"),
    render("/maps"),
    render("/offline"),
    render("/diagnostic"),
    render("/learning-graph"),
    render("/cases"),
    render("/visual-lab"),
  ]);

  for (const response of [learnResponse, coverageResponse, alignmentResponse, lessonResponse, outputResponse, reviewResponse, libraryResponse, assessmentResponse, mistakesResponse, routesResponse, mapsResponse, offlineResponse, diagnosticResponse, graphResponse, casesResponse, visualLabResponse]) {
    assert.equal(response.status, 200);
  }

  const [learnHtml, coverageHtml, alignmentHtml, lessonHtml, outputHtml, reviewHtml, libraryHtml, assessmentHtml, mistakesHtml, routesHtml, mapsHtml, offlineHtml, diagnosticHtml, graphHtml, casesHtml, visualLabHtml] = await Promise.all([
    learnResponse.text(), coverageResponse.text(), alignmentResponse.text(), lessonResponse.text(), outputResponse.text(), reviewResponse.text(), libraryResponse.text(), assessmentResponse.text(), mistakesResponse.text(), routesResponse.text(), mapsResponse.text(), offlineResponse.text(), diagnosticResponse.text(), graphResponse.text(), casesResponse.text(), visualLabResponse.text(),
  ]);
  assert.match(learnHtml, /Choose the subject/);
  assert.match(learnHtml, /Internal Medicine I/);
  assert.match(learnHtml, /Perioperative Medicine I/);
  assert.match(learnHtml, /Women &amp; Child Health I/);
  assert.match(learnHtml, /Subject.*Clinical system.*Lesson/s);
  assert.match(learnHtml, /Cardiovascular route/);
  assert.match(learnHtml, /68 Semester 7 objectives/);
  assert.match(learnHtml, /28 source-mapped objectives/);
  assert.match(learnHtml, /Measure, learn, apply, correct/);
  assert.match(learnHtml, /Adaptive next step/);
  assert.match(coverageHtml, /Objective-level coverage/);
  assert.match(coverageHtml, /complete path/);
  assert.match(coverageHtml, /Internal Medicine I/);
  assert.match(coverageHtml, /Perioperative Medicine I/);
  assert.match(coverageHtml, /Women &amp; Child Health I/);
  assert.match(alignmentHtml, /Every topic now has/);
  assert.match(alignmentHtml, /Course identity needs confirmation/);
  assert.match(alignmentHtml, /Foundation-first source bridge/);
  assert.match(alignmentHtml, /Review &amp; approve/);
  assert.match(alignmentHtml, /Paste or import an alignment table/);
  assert.match(alignmentHtml, /Import as review drafts/);
  assert.match(alignmentHtml, /Steps 7–10/);
  assert.match(alignmentHtml, /From approved map to Professor Mode/);
  assert.match(alignmentHtml, /Acute bronchitis/);
  assert.match(alignmentHtml, /Schwartz/);
  assert.match(alignmentHtml, /Williams Obstetrics/);
  assert.match(alignmentHtml, /Neonatal jaundice/);
  assert.match(alignmentHtml, /No direct source/);
  assert.match(lessonHtml, /Professor Mode/);
  assert.match(lessonHtml, /Citation-first Professor Mode/);
  assert.match(lessonHtml, /Need a hint/);
  assert.match(lessonHtml, /Show options/);
  assert.match(lessonHtml, /Sideways concept map/);
  assert.match(lessonHtml, /Source trail/);
  assert.match(lessonHtml, /Active recall checkpoint/);
  assert.match(outputHtml, /Cardiac output/);
  assert.match(outputHtml, /CO = HR × SV/);
  assert.match(outputHtml, /From one beat to flow per minute/);
  assert.match(outputHtml, /Professor explanation/);
  assert.match(reviewHtml, /Adaptive memory/);
  assert.match(reviewHtml, /Review what your memory/);
  assert.match(libraryHtml, /Upload sources/);
  assert.match(libraryHtml, /Book section/);
  assert.match(libraryHtml, /Alignment plan/);
  assert.match(libraryHtml, /Table of contents/);
  assert.match(libraryHtml, /Saved by semester/);
  assert.match(libraryHtml, /Independent fast path/);
  assert.match(assessmentHtml, /Clinical Assessment Centre/);
  assert.match(assessmentHtml, /Test the connection/);
  assert.match(assessmentHtml, /SAQ and Mini-OSCE practice/);
  assert.match(mistakesHtml, /Keep the mistake/);
  assert.match(mistakesHtml, /Your mistake notebook/);
  assert.match(routesHtml, /Know what comes next/);
  assert.match(routesHtml, /Subject-specific sequence/);
  assert.match(mapsHtml, /Your thinking/);
  assert.match(mapsHtml, /Saved sideways maps/);
  assert.match(offlineHtml, /Carry only the block/);
  assert.match(offlineHtml, /Save selected pack/);
  assert.match(diagnosticHtml, /Start where your/);
  assert.match(diagnosticHtml, /75%/);
  assert.match(graphHtml, /Every activity has/);
  assert.match(graphHtml, /Semester 7 objective/);
  assert.match(casesHtml, /Reason through the case/);
  assert.match(casesHtml, /Why the case stops at physiology/);
  assert.match(visualLabHtml, /Read the pattern/);
  assert.match(visualLabHtml, /Electrical-pattern lab/);
});

test("declares durable learning, adaptive application, correction, map, review, and document storage", async () => {
  const [hostingText, schemaText, migrationText, alignmentMigrationText, learningMigrationText, connectedLearningMigrationText, adaptiveMigrationText, runtimeSchemaText, documentRouteText, alignmentRouteText, lessonSourceRouteText, lessonDraftRouteText, reviewRouteText, coverageRouteText, assessmentRouteText, diagnosticRouteText, caseRouteText, visualRouteText, engineRouteText, attemptsText, mistakesRouteText, mindMapRouteText, masteryRouteText, lessonSourceRegistryText, serviceWorkerText, manifestText] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_dark_exodus.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_ancient_ulik.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0002_free_scalphunter.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_fresh_black_crow.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_awesome_shockwave.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/documents/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/alignments/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/lesson-sources/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/lesson-drafts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reviews/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/coverage/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/assessments/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/diagnostic/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cases/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/visual-lab/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/learning-engine/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/learning-attempts.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/mistakes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/mind-maps/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/mastery/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/lesson-sources.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
  ]);
  const hosting = JSON.parse(hostingText);
  assert.equal(hosting.d1, "DB");
  assert.equal(hosting.r2, "DOCUMENTS");
  assert.match(schemaText, /lessonProgress|lessonNotes|studyDocuments|alignmentReviews|importedAlignments|documentSourceDetails|lessonDrafts|recallReviews|assessmentAttempts|mistakeNotebook|noteMindMaps/);
  assert.match(migrationText, /CREATE TABLE `lesson_progress`/);
  assert.match(migrationText, /CREATE TABLE `study_documents`/);
  assert.match(alignmentMigrationText, /CREATE TABLE `alignment_reviews`/);
  assert.match(alignmentMigrationText, /CREATE TABLE `imported_alignments`/);
  assert.match(alignmentMigrationText, /CREATE TABLE `document_source_details`/);
  assert.match(learningMigrationText, /CREATE TABLE `lesson_drafts`/);
  assert.match(learningMigrationText, /CREATE TABLE `recall_reviews`/);
  assert.match(connectedLearningMigrationText, /CREATE TABLE `assessment_attempts`/);
  assert.match(connectedLearningMigrationText, /CREATE TABLE `mistake_notebook`/);
  assert.match(connectedLearningMigrationText, /CREATE TABLE `note_mind_maps`/);
  assert.match(adaptiveMigrationText, /CREATE TABLE `learning_activity_attempts`/);
  assert.match(runtimeSchemaText, /CREATE TABLE IF NOT EXISTS lesson_drafts/);
  assert.match(runtimeSchemaText, /CREATE TABLE IF NOT EXISTS recall_reviews/);
  assert.match(documentRouteText, /MAX_FILES = 5/);
  assert.match(documentRouteText, /getStudyBucket/);
  assert.match(documentRouteText, /Book section/);
  assert.match(alignmentRouteText, /parseAlignmentTable/);
  assert.match(alignmentRouteText, /changes_requested/);
  assert.match(lessonSourceRouteText, /alignmentReviews/);
  assert.match(lessonDraftRouteText, /approval_required/);
  assert.match(lessonDraftRouteText, /source_required/);
  assert.match(lessonDraftRouteText, /Draft outline only/);
  assert.match(reviewRouteText, /again/);
  assert.match(reviewRouteText, /calculateAdaptiveReview/);
  assert.match(coverageRouteText, /coverageObjectives/);
  assert.match(assessmentRouteText, /assessmentAttempts/);
  assert.match(assessmentRouteText, /mistakeNotebook/);
  assert.match(diagnosticRouteText, /domainScores/);
  assert.match(caseRouteText, /clinical_case/);
  assert.match(visualRouteText, /visual_lab/);
  assert.match(engineRouteText, /next-best-action|Find your starting point/);
  assert.match(attemptsText, /mistakeNotebook/);
  assert.match(mistakesRouteText, /nextReviewAt/);
  assert.match(mindMapRouteText, /nodesJson/);
  assert.match(masteryRouteText, /calculateMastery/);
  assert.match(serviceWorkerText, /CACHE_TRAVEL_PACK/);
  assert.match(serviceWorkerText, /poh-tah-toh-travel-v8/);
  assert.match(manifestText, /Poh-tah-toh Medical Study Companion/);
  assert.match(manifestText, /cat-icon-512\.png/);
  assert.match(lessonSourceRegistryText, /foundation-03/);
  assert.match(lessonSourceRegistryText, /foundation-04/);
});

test("renders oral viva, comparison, interleaving, confidence, and exam-blueprint modes", async () => {
  const [practiceResponse, vivaResponse, comparisonResponse, interleavedResponse, confidenceResponse, blueprintResponse] = await Promise.all([
    render("/practice"),
    render("/viva"),
    render("/comparisons"),
    render("/interleaved"),
    render("/confidence"),
    render("/exam-blueprint"),
  ]);
  for (const response of [practiceResponse, vivaResponse, comparisonResponse, interleavedResponse, confidenceResponse, blueprintResponse]) assert.equal(response.status, 200);
  const [practiceHtml, vivaHtml, comparisonHtml, interleavedHtml, confidenceHtml, blueprintHtml] = await Promise.all([
    practiceResponse.text(), vivaResponse.text(), comparisonResponse.text(), interleavedResponse.text(), confidenceResponse.text(), blueprintResponse.text(),
  ]);
  assert.match(practiceHtml, /Explain it\. Mix it/);
  assert.match(practiceHtml, /Oral viva mode/);
  assert.match(vivaHtml, /Say the mechanism/);
  assert.match(vivaHtml, /Speak answer/);
  assert.match(comparisonHtml, /Keep normal on the left/);
  assert.match(comparisonHtml, /Source required/);
  assert.match(interleavedHtml, /Switch the mechanism/);
  assert.match(interleavedHtml, /how sure are you/);
  assert.match(confidenceHtml, /Correctly certain is safer/);
  assert.match(confidenceHtml, /Confident but incorrect/);
  assert.match(blueprintHtml, /Every objective needs/);
  assert.match(blueprintHtml, /not an official university weighting/);

  const [vivaApi, interleavedApi, confidenceApi, blueprintApi, advancedLearning, engineApi] = await Promise.all([
    readFile(new URL("../app/api/viva/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/interleaved/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/confidence/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/exam-blueprint/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/advanced-learning.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/learning-engine/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(vivaApi, /saveVivaAttempt/);
  assert.match(interleavedApi, /interleaved_review/);
  assert.match(confidenceApi, /highConfidenceWrong/);
  assert.match(blueprintApi, /coverageObjectives/);
  assert.match(advancedLearning, /Requires an approved clinical source/);
  assert.match(engineApi, /Hidden certainty risk/);
});

test("renders approved-source search, recoverable history, and private backup", async () => {
  const [toolsResponse, searchResponse, historyResponse, backupResponse] = await Promise.all([
    render("/study-tools"),
    render("/source-search"),
    render("/history"),
    render("/backup"),
  ]);
  for (const response of [toolsResponse, searchResponse, historyResponse, backupResponse]) assert.equal(response.status, 200);
  const [toolsHtml, searchHtml, historyHtml, backupHtml] = await Promise.all([
    toolsResponse.text(), searchResponse.text(), historyResponse.text(), backupResponse.text(),
  ]);
  assert.match(toolsHtml, /Your sources now drive/);
  assert.match(toolsHtml, /Smart source search/);
  assert.match(searchHtml, /Search the approved shelf/);
  assert.match(searchHtml, /approved syllabus mapping/);
  assert.match(historyHtml, /See what changed/);
  assert.match(historyHtml, /safety copy/);
  assert.match(backupHtml, /Restore selectively/);
  assert.match(backupHtml, /Internal identity removed/);

  const [migration, runtimeSchema, sourceApi, historyApi, backupApi, learningHistory, masteryCalculation, serviceWorker] = await Promise.all([
    readFile(new URL("../drizzle/0005_hard_maestro.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/source-search/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/history/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/backup/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/learning-history.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/mastery-calculation.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /CREATE TABLE `learning_versions`/);
  assert.match(runtimeSchema, /CREATE TABLE IF NOT EXISTS learning_versions/);
  assert.match(sourceApi, /decision === "approved"/);
  assert.match(sourceApi, /Book section/);
  assert.match(sourceApi, /\?page=/);
  assert.match(historyApi, /pre_rollback/);
  assert.match(historyApi, /recordLearningVersion/);
  assert.match(learningHistory, /payloadJson/);
  assert.match(backupApi, /delete safe\.ownerId/);
  assert.match(backupApi, /delete safe\.objectKey/);
  assert.match(backupApi, /content-disposition/);
  assert.match(masteryCalculation, /assessmentComponent/);
  assert.match(serviceWorker, /poh-tah-toh-travel-v8/);
  assert.match(serviceWorker, /CACHE_TRAVEL_PACK/);
});

test("renders deep source extraction, linked reading, and citation-first Professor Mode", async () => {
  const [toolsResponse, searchResponse, readerResponse, lessonResponse, libraryResponse] = await Promise.all([
    render("/study-tools"),
    render("/source-search"),
    render("/reader/example-source"),
    render("/learn/cardiovascular/cardiac-cycle"),
    render("/library"),
  ]);
  for (const response of [toolsResponse, searchResponse, readerResponse, lessonResponse, libraryResponse]) assert.equal(response.status, 200);
  const [toolsHtml, searchHtml, readerHtml, lessonHtml, libraryHtml] = await Promise.all([
    toolsResponse.text(), searchResponse.text(), readerResponse.text(), lessonResponse.text(), libraryResponse.text(),
  ]);
  assert.match(toolsHtml, /Deep PDF &amp; Word search/);
  assert.match(toolsHtml, /Citation-first Professor/);
  assert.match(searchHtml, /Down to the passage/);
  assert.match(searchHtml, /private searchable pages/);
  assert.match(readerHtml, /Loading the private indexed section/);
  assert.match(lessonHtml, /Citation-first Professor Mode/);
  assert.match(lessonHtml, /Evidence boundary/);
  assert.match(libraryHtml, /Private deep index/);

  const [migration, schema, runtimeSchema, extractionClient, extractionApi, searchApi, readerApi, evidenceApi, backupApi] = await Promise.all([
    readFile(new URL("../drizzle/0006_nasty_photon.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/source-extraction-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/document-extractions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/source-search/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/source-reader/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/professor-evidence/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/backup/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /CREATE TABLE `document_extractions`/);
  assert.match(migration, /CREATE TABLE `document_text_chunks`/);
  assert.match(migration, /CREATE TABLE `source_citations`/);
  assert.match(schema, /documentExtractions|documentTextChunks|sourceCitations/);
  assert.match(runtimeSchema, /CREATE TABLE IF NOT EXISTS source_citations/);
  assert.match(extractionClient, /pdfjs-dist/);
  assert.match(extractionClient, /tesseract\.js/);
  assert.match(extractionClient, /mammoth/);
  assert.match(extractionClient, /OCR_PAGE_LIMIT/);
  assert.match(extractionApi, /MAX_TOTAL_CHARACTERS/);
  assert.match(searchApi, /documentTextChunks/);
  assert.doesNotMatch(searchApi, /getStudyBucket/);
  assert.match(readerApi, /normalizeQuote\(chunk\.textContent\)\.includes/);
  assert.match(readerApi, /recordLearningVersion/);
  assert.match(evidenceApi, /decision === "approved"/);
  assert.match(evidenceApi, /gate: evidence\.length \? "supported"/);
  assert.match(backupApi, /sourceCitations/);
  assert.doesNotMatch(backupApi, /documentTextChunks/);
});

test("renders objective evidence, a daily queue, adaptive spacing, and reviewed source questions", async () => {
  const [toolsResponse, coverageResponse, todayResponse, reviewResponse, questionsResponse] = await Promise.all([
    render("/study-tools"),
    render("/coverage"),
    render("/today"),
    render("/review"),
    render("/question-studio"),
  ]);
  for (const response of [toolsResponse, coverageResponse, todayResponse, reviewResponse, questionsResponse]) assert.equal(response.status, 200);
  const [toolsHtml, coverageHtml, todayHtml, reviewHtml, questionsHtml] = await Promise.all([
    toolsResponse.text(), coverageResponse.text(), todayResponse.text(), reviewResponse.text(), questionsResponse.text(),
  ]);
  assert.match(toolsHtml, /Objective-level coverage/);
  assert.match(toolsHtml, /Adaptive daily queue/);
  assert.match(toolsHtml, /Smarter spaced repetition/);
  assert.match(toolsHtml, /Approved-source questions/);
  assert.match(coverageHtml, /chapter, exact page state/);
  assert.match(coverageHtml, /remaining gaps/);
  assert.match(todayHtml, /highest-value/);
  assert.match(todayHtml, /Ordered by learning value/);
  assert.match(reviewHtml, /accuracy, difficulty, confidence/);
  assert.match(questionsHtml, /exact passage/);
  assert.match(questionsHtml, /Human review gate/);

  const [migration, schema, runtimeSchema, coverageApi, dailyApi, reviewApi, spacing, questionApi, backupApi, offlinePacks] = await Promise.all([
    readFile(new URL("../drizzle/0007_ambiguous_chimera.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/coverage/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/daily-queue/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reviews/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/adaptive-spacing.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/generated-questions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/backup/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/offline-packs.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /CREATE TABLE `daily_queue_actions`/);
  assert.match(migration, /CREATE TABLE `recall_review_signals`/);
  assert.match(migration, /CREATE TABLE `generated_questions`/);
  assert.match(schema, /dailyQueueActions|recallReviewSignals|generatedQuestions/);
  assert.match(runtimeSchema, /CREATE TABLE IF NOT EXISTS generated_questions/);
  assert.match(coverageApi, /questionSummary/);
  assert.match(coverageApi, /Confirm an exact page/);
  assert.match(dailyApi, /forgettingScore/);
  assert.match(dailyApi, /priority/);
  assert.match(dailyApi, /dailyQueueActions/);
  assert.match(reviewApi, /calculateAdaptiveReview/);
  assert.match(spacing, /confidence|difficulty|lapseCount|forgettingScore/);
  assert.match(questionApi, /review\?\.decision !== "approved"/);
  assert.match(questionApi, /status: "pending_review"/);
  assert.match(questionApi, /normalize\(chunk\.textContent\)\.includes/);
  assert.match(questionApi, /clinical_case/);
  assert.match(backupApi, /recallReviewSignals/);
  assert.match(backupApi, /dailyQueueActions/);
  assert.match(backupApi, /generatedQuestions/);
  assert.match(offlinePacks, /question-studio/);
  assert.match(offlinePacks, /\/today/);
});

test("renders source-cited reasoning, misconception repair, and approved cross-book comparison", async () => {
  const [toolsResponse, reasoningResponse, misconceptionsResponse, compareResponse] = await Promise.all([
    render("/study-tools"),
    render("/reasoning-ladder"),
    render("/misconceptions"),
    render("/source-compare"),
  ]);
  for (const response of [toolsResponse, reasoningResponse, misconceptionsResponse, compareResponse]) assert.equal(response.status, 200);
  const [toolsHtml, reasoningHtml, misconceptionsHtml, compareHtml] = await Promise.all([
    toolsResponse.text(), reasoningResponse.text(), misconceptionsResponse.text(), compareResponse.text(),
  ]);
  assert.match(toolsHtml, /Clinical reasoning ladder/);
  assert.match(toolsHtml, /Misconception detector/);
  assert.match(toolsHtml, /Cross-book comparison/);
  assert.match(reasoningHtml, /Reason from normal/);
  assert.match(reasoningHtml, /Six linked decisions/);
  assert.match(misconceptionsHtml, /Find the confusion/);
  assert.match(misconceptionsHtml, /Error pattern/);
  assert.match(compareHtml, /Compare the passages/);
  assert.match(compareHtml, /Two approved books/);

  const [migration, schema, runtimeSchema, reasoningApi, misconceptionsApi, comparisonApi, reasoningLibrary, dailyApi, backupApi, offlinePacks] = await Promise.all([
    readFile(new URL("../drizzle/0008_absent_randall_flagg.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reasoning-ladder/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/misconceptions/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/source-comparison/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/source-reasoning.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/daily-queue/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/backup/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/offline-packs.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /CREATE TABLE `clinical_reasoning_progress`/);
  assert.match(migration, /CREATE TABLE `misconception_repairs`/);
  assert.match(migration, /CREATE TABLE `objective_source_links`/);
  assert.match(schema, /clinicalReasoningProgress|misconceptionRepairs|objectiveSourceLinks/);
  assert.match(runtimeSchema, /CREATE TABLE IF NOT EXISTS clinical_reasoning_progress/);
  assert.match(reasoningApi, /decision === "approved"/);
  assert.match(reasoningApi, /sourceQuote === stage\.evidence\.quote/);
  assert.match(reasoningApi, /Complete the earlier stage or attach a matching approved passage first/);
  assert.match(misconceptionsApi, /parseIncorrectQuestionCounts/);
  assert.match(misconceptionsApi, /recall lapses/);
  assert.match(misconceptionsApi, /not a diagnosis of the learner/);
  assert.match(comparisonApi, /Both books must be approved for this objective before comparison/);
  assert.match(comparisonApi, /pending_review/);
  assert.doesNotMatch(reasoningApi, /getStudyBucket/);
  assert.doesNotMatch(comparisonApi, /getStudyBucket/);
  assert.match(reasoningLibrary, /Normal physiology/);
  assert.match(reasoningLibrary, /Possible directional difference/);
  assert.match(reasoningLibrary, /No automatic contradiction detected/);
  assert.match(dailyApi, /misconception-/);
  assert.match(dailyApi, /reasoning-/);
  assert.match(backupApi, /objectiveSourceLinks|clinicalReasoningProgress|misconceptionRepairs/);
  assert.match(offlinePacks, /reasoning-ladder/);
  assert.match(offlinePacks, /misconceptions/);
  assert.match(offlinePacks, /source-compare/);
});

test("renders connected notes, visual comparisons, selective restoration, custom packs, and fast processing", async () => {
  const [toolsResponse, notesResponse, historyResponse, backupResponse, offlineResponse, libraryResponse] = await Promise.all([
    render("/study-tools"), render("/note-workspace"), render("/history"), render("/backup"), render("/offline"), render("/library"),
  ]);
  for (const response of [toolsResponse, notesResponse, historyResponse, backupResponse, offlineResponse, libraryResponse]) assert.equal(response.status, 200);
  const [toolsHtml, notesHtml, historyHtml, backupHtml, offlineHtml, libraryHtml] = await Promise.all([
    toolsResponse.text(), notesResponse.text(), historyResponse.text(), backupResponse.text(), offlineResponse.text(), libraryResponse.text(),
  ]);
  assert.match(toolsHtml, /Connected note workspace/);
  assert.match(toolsHtml, /High-speed processing/);
  assert.match(notesHtml, /Every idea keeps/);
  assert.match(notesHtml, /Traceability remains strict/);
  assert.match(historyHtml, /Visual version comparison/);
  assert.match(backupHtml, /Preview before restoration/);
  assert.match(offlineHtml, /Subjects, systems &amp; exam blocks/);
  assert.match(libraryHtml, /Incremental source processing/);

  const [migration, schema, runtimeSchema, connectedApi, historyApi, restoreApi, offlinePacks, processingApi, searchApi, extractionApi] = await Promise.all([
    readFile(new URL("../drizzle/0009_premium_tinkerer.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/runtime-schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/connected-notes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/history/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/backup/restore/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/offline-packs.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/source-processing/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/source-search/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/document-extractions/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(migration, /CREATE TABLE `learning_evidence_links`/);
  assert.match(migration, /CREATE TABLE `backup_restore_audits`/);
  assert.match(migration, /CREATE TABLE `source_processing_jobs`/);
  assert.match(migration, /CREATE TABLE `source_search_terms`/);
  assert.match(migration, /CREATE TABLE `source_search_cache`/);
  assert.match(schema, /learningEvidenceLinks|backupRestoreAudits|sourceProcessingJobs|sourceSearchTerms|sourceSearchCache/);
  assert.match(runtimeSchema, /CREATE TABLE IF NOT EXISTS learning_evidence_links/);
  assert.match(connectedApi, /row\?\.status === "approved"/);
  assert.match(historyApi, /Compare two versions and choose one from that preview before restoring/);
  assert.match(restoreApi, /INSERT OR IGNORE/);
  assert.match(restoreApi, /backup changed after preview/i);
  assert.match(offlinePacks, /kind: "subject"|kind: "system"|kind: "exam"/);
  assert.match(processingApi, /limit\(8\)/);
  assert.match(searchApi, /source_search_terms/);
  assert.match(searchApi, /performance: \{ cache: "hit"/);
  assert.match(extractionApi, /sourceProcessingJobs/);
});

test("removes the disposable starter and includes production brand metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /export default function Home/);
  assert.match(page, /Foundation before disease/);
  assert.match(layout, /Poh-tah-toh — Medical Study Companion/);
  assert.match(layout, /cat-icon-192\.png/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.doesNotReject(access(new URL("../public/cat-icon-192.png", import.meta.url)));
  await assert.doesNotReject(access(new URL("../public/cat-icon-512.png", import.meta.url)));
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});
