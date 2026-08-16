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
  assert.match(coverageHtml, /Syllabus mastery dashboard/);
  assert.match(coverageHtml, /See what is mapped/);
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
  assert.match(lessonHtml, /Adaptive Professor Mode/);
  assert.match(lessonHtml, /Need a hint/);
  assert.match(lessonHtml, /Show options/);
  assert.match(lessonHtml, /Sideways concept map/);
  assert.match(lessonHtml, /Source trail/);
  assert.match(lessonHtml, /Active recall checkpoint/);
  assert.match(outputHtml, /Cardiac output/);
  assert.match(outputHtml, /CO = HR × SV/);
  assert.match(outputHtml, /From one beat to flow per minute/);
  assert.match(outputHtml, /Professor explanation/);
  assert.match(reviewHtml, /Smart recall queue/);
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
  assert.match(offlineHtml, /Carry the lesson/);
  assert.match(offlineHtml, /Save core learning pack/);
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
  assert.match(reviewRouteText, /10 \* 60 \* 1000/);
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
  assert.match(masteryRouteText, /assessmentComponent/);
  assert.match(serviceWorkerText, /CACHE_TRAVEL_PACK/);
  assert.match(serviceWorkerText, /learning-graph/);
  assert.match(manifestText, /Poh-tah-toh Medical Study Companion/);
  assert.match(manifestText, /cat-icon-512\.png/);
  assert.match(lessonSourceRegistryText, /foundation-03/);
  assert.match(lessonSourceRegistryText, /foundation-04/);
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
