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

test("server-renders the Vitae medical study dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Vitae — Medical Study Companion<\/title>/i);
  assert.match(html, /Good morning, Aanya\./);
  assert.match(html, /The cardiac cycle/);
  assert.match(html, /Today(?:&#x27;|&apos;|')s plan/);
  assert.match(html, /Atlas · Study companion/);
  assert.match(html, /Medicine, made learnable/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders the curriculum, source alignment, Professor Mode lesson, and source library", async () => {
  const [learnResponse, alignmentResponse, lessonResponse, outputResponse, libraryResponse] = await Promise.all([
    render("/learn"),
    render("/alignment"),
    render("/learn/cardiovascular/cardiac-cycle"),
    render("/learn/cardiovascular/cardiac-output"),
    render("/library"),
  ]);

  for (const response of [learnResponse, alignmentResponse, lessonResponse, outputResponse, libraryResponse]) {
    assert.equal(response.status, 200);
  }

  const [learnHtml, alignmentHtml, lessonHtml, outputHtml, libraryHtml] = await Promise.all([
    learnResponse.text(), alignmentResponse.text(), lessonResponse.text(), outputResponse.text(), libraryResponse.text(),
  ]);
  assert.match(learnHtml, /Build the body before/);
  assert.match(learnHtml, /Cardiovascular route/);
  assert.match(learnHtml, /30 syllabus topic groups/);
  assert.match(alignmentHtml, /Every topic now has/);
  assert.match(alignmentHtml, /Course identity needs confirmation/);
  assert.match(alignmentHtml, /Foundation-first source bridge/);
  assert.match(alignmentHtml, /Review &amp; approve/);
  assert.match(alignmentHtml, /Paste or import an alignment table/);
  assert.match(alignmentHtml, /Import as review drafts/);
  assert.match(alignmentHtml, /Steps 7–10/);
  assert.match(alignmentHtml, /From approved map to Professor Mode/);
  assert.match(alignmentHtml, /Acute bronchitis/);
  assert.match(alignmentHtml, /No direct source/);
  assert.match(lessonHtml, /Professor Mode/);
  assert.match(lessonHtml, /Sideways concept map/);
  assert.match(lessonHtml, /Source trail/);
  assert.match(lessonHtml, /Active recall checkpoint/);
  assert.match(outputHtml, /Cardiac output/);
  assert.match(outputHtml, /CO = HR × SV/);
  assert.match(outputHtml, /From one beat to flow per minute/);
  assert.match(outputHtml, /Professor explanation/);
  assert.match(libraryHtml, /Upload sources/);
  assert.match(libraryHtml, /Book section/);
  assert.match(libraryHtml, /Alignment plan/);
  assert.match(libraryHtml, /Table of contents/);
  assert.match(libraryHtml, /Saved by semester/);
});

test("declares durable progress, notes, source trails, and document storage", async () => {
  const [hostingText, schemaText, migrationText, alignmentMigrationText, documentRouteText, alignmentRouteText, lessonSourceRouteText, lessonSourceRegistryText] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_dark_exodus.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_ancient_ulik.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/documents/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/alignments/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/lesson-sources/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/lesson-sources.ts", import.meta.url), "utf8"),
  ]);
  const hosting = JSON.parse(hostingText);
  assert.equal(hosting.d1, "DB");
  assert.equal(hosting.r2, "DOCUMENTS");
  assert.match(schemaText, /lessonProgress|lessonNotes|studyDocuments|alignmentReviews|importedAlignments|documentSourceDetails/);
  assert.match(migrationText, /CREATE TABLE `lesson_progress`/);
  assert.match(migrationText, /CREATE TABLE `study_documents`/);
  assert.match(alignmentMigrationText, /CREATE TABLE `alignment_reviews`/);
  assert.match(alignmentMigrationText, /CREATE TABLE `imported_alignments`/);
  assert.match(alignmentMigrationText, /CREATE TABLE `document_source_details`/);
  assert.match(documentRouteText, /MAX_FILES = 5/);
  assert.match(documentRouteText, /getStudyBucket/);
  assert.match(documentRouteText, /Book section/);
  assert.match(alignmentRouteText, /parseAlignmentTable/);
  assert.match(alignmentRouteText, /changes_requested/);
  assert.match(lessonSourceRouteText, /alignmentReviews/);
  assert.match(lessonSourceRegistryText, /foundation-03/);
  assert.match(lessonSourceRegistryText, /foundation-04/);
});

test("removes the disposable starter and includes production social metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /export default function Home/);
  assert.match(page, /Foundation before disease/);
  assert.match(layout, /Vitae — Medical Study Companion/);
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.doesNotReject(access(new URL("../public/og.png", import.meta.url)));
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});
