"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Subject = "Internal Medicine I" | "Perioperative Medicine I" | "Women & Child Health I";
type Stage = "mapped" | "needs_review" | "missing_source" | "approved" | "lesson_ready";
type Objective = {
  id: string; subject: Subject; system: string; week: string; topic: string; primarySource: string; pageReference: string;
  mappingStatus: string; decision: string; stage: Stage; draft: { title: string; updatedAt: string; outlineJson: string } | null;
  lessonLinks: Array<{ slug: string; title: string; href: string; draft?: boolean }>;
  linkedSource: { id: string; filename: string; bookTitle: string; sectionLabel: string; pageRange: string; searchablePages: number; readerHref: string } | null;
  questionSummary: { total: number; pending: number; approved: number; types: string[] };
  learningEvidence: { completedLessons: number; totalLessons: number; recallCards: number; reviewedCards: number };
  gaps: string[];
};
type Summary = { total: number; approved: number; lessonReady: number; mapped: number; needsReview: number; missingSource: number; completedLessons: number; dueReviews: number; exactPageReady: number; sourceLinked: number; questionReady: number; gapCount: number };
type BookSection = { id: string; subject: string; filename: string; sourceDetails: { bookTitle: string; bookEdition: string; sectionLabel: string; pageRange: string } | null };

const subjects: Array<"All" | Subject> = ["All", "Internal Medicine I", "Perioperative Medicine I", "Women & Child Health I"];
const stageLabels: Record<Stage, string> = {
  mapped: "Mapped",
  needs_review: "Needs chapter review",
  missing_source: "Missing source",
  approved: "Approved",
  lesson_ready: "Draft ready",
};

function draftSections(draft: Objective["draft"]) {
  if (!draft) return [];
  try {
    const parsed = JSON.parse(draft.outlineJson) as { sections?: Array<{ label: string }> };
    return parsed.sections?.map((section) => section.label).filter(Boolean) ?? [];
  } catch { return []; }
}

function subjectMatches(documentSubject: string, objectiveSubject: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/\bi\b/g, "").replace(/[^a-z&]+/g, " ").trim();
  return normalize(documentSubject).includes(normalize(objectiveSubject)) || normalize(objectiveSubject).includes(normalize(documentSubject));
}

function bookSectionLabel(section: BookSection) {
  if (!section.sourceDetails) return section.filename;
  return `${section.sourceDetails.bookTitle}${section.sourceDetails.sectionLabel ? ` · ${section.sourceDetails.sectionLabel}` : ""}${section.sourceDetails.pageRange ? ` · pp. ${section.sourceDetails.pageRange}` : ""}`;
}

export function CoverageWorkspace() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, approved: 0, lessonReady: 0, mapped: 0, needsReview: 0, missingSource: 0, completedLessons: 0, dueReviews: 0, exactPageReady: 0, sourceLinked: 0, questionReady: 0, gapCount: 0 });
  const [subject, setSubject] = useState<"All" | Subject>("All");
  const [stage, setStage] = useState<"all" | Stage>("all");
  const [query, setQuery] = useState("");
  const [working, setWorking] = useState("");
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [bookSections, setBookSections] = useState<BookSection[]>([]);
  const [selectedSources, setSelectedSources] = useState<Record<string, string>>({});

  const loadCoverage = useCallback(async () => {
    const response = await fetch("/api/coverage");
    if (!response.ok) return;
    const data = await response.json();
    setObjectives(data.objectives ?? []);
    setBookSections(data.bookSections ?? []);
    if (data.summary) setSummary(data.summary);
  }, []);

  useEffect(() => { loadCoverage().catch(() => undefined); }, [loadCoverage]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return objectives.filter((objective) => (subject === "All" || objective.subject === subject)
      && (stage === "all" || objective.stage === stage)
      && (!normalized || `${objective.topic} ${objective.system} ${objective.primarySource}`.toLowerCase().includes(normalized)));
  }, [objectives, query, stage, subject]);

  const subjectCards = useMemo(() => subjects.slice(1).map((item) => {
    const rows = objectives.filter((objective) => objective.subject === item);
    return { subject: item, total: rows.length, approved: rows.filter((row) => row.decision === "approved").length, ready: rows.filter((row) => row.stage === "lesson_ready").length };
  }), [objectives]);

  async function createDraft(alignmentId: string) {
    const sourceDocumentId = selectedSources[alignmentId] ?? "";
    if (!sourceDocumentId) {
      setMessages((current) => ({ ...current, [alignmentId]: "Choose the matching uploaded book section first." }));
      return;
    }
    setWorking(alignmentId); setMessages((current) => ({ ...current, [alignmentId]: "Preparing source-locked outline…" }));
    try {
      const response = await fetch("/api/lesson-drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ alignmentId, sourceDocumentId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The draft could not be created.");
      setMessages((current) => ({ ...current, [alignmentId]: "Draft outline ready for source review." }));
      await loadCoverage();
    } catch (error) {
      setMessages((current) => ({ ...current, [alignmentId]: error instanceof Error ? error.message : "The draft could not be created." }));
    } finally { setWorking(""); }
  }

  return (
    <div className="coverage-page">
      <header className="coverage-hero">
        <div><span className="eyebrow"><i /> Recommendation 29 · Objective-level coverage</span><h1>See the complete path<br />behind every objective.</h1><p>Each syllabus objective now connects to its chapter, exact page state, uploaded section, lesson, recall evidence, approved questions, and remaining gaps.</p><div><a className="primary-button primary-button--dark" href="#coverage-list">Open objective paths <span>↓</span></a><a href="/question-studio">Open question studio →</a></div></div>
        <div className="coverage-score"><span>Semester 7 evidence chain</span><strong>{summary.total}<small>syllabus objectives</small></strong><div><span><b>{summary.exactPageReady}</b><small>page mapped</small></span><span><b>{summary.sourceLinked}</b><small>section linked</small></span><span><b>{summary.questionReady}</b><small>questions approved</small></span></div></div>
      </header>

      <section className="coverage-subject-grid" aria-label="Coverage by subject">
        {subjectCards.map((card, index) => <button type="button" className={subject === card.subject ? "is-active" : ""} onClick={() => setSubject(card.subject)} key={card.subject}><span>{String(index + 1).padStart(2, "0")}</span><strong>{card.subject}</strong><p>{card.total} objectives</p><small>{card.approved} approved · {card.ready} draft ready</small></button>)}
      </section>

      <section id="coverage-list" className="coverage-list" aria-labelledby="coverage-title">
        <header className="section-header"><div><span className="eyebrow">Objective-by-objective</span><h2 id="coverage-title">Syllabus coverage</h2></div><span>{filtered.length} shown</span></header>
        <div className="coverage-toolbar">
          <label><span className="sr-only">Filter subject</span><select value={subject} onChange={(event) => setSubject(event.target.value as "All" | Subject)}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span className="sr-only">Filter stage</span><select value={stage} onChange={(event) => setStage(event.target.value as "all" | Stage)}><option value="all">All stages</option>{Object.entries(stageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="coverage-search"><span aria-hidden="true">⌕</span><span className="sr-only">Search objectives</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search an objective or source" /></label>
        </div>
        <div className="coverage-objectives">
          {filtered.map((objective) => {
            const matchingSections = bookSections.filter((section) => subjectMatches(section.subject, objective.subject));
            return <article id={`objective-${objective.id}`} key={objective.id}>
            <div className="coverage-week"><span>{objective.subject}</span><strong>{objective.system}</strong><small>Week {objective.week}</small></div>
            <div className="coverage-objective"><span className={`coverage-stage coverage-stage--${objective.stage}`}>{stageLabels[objective.stage]}</span><h3>{objective.topic}</h3><p><strong>{objective.primarySource}</strong><small>{objective.pageReference}</small></p>{objective.linkedSource ? <a className="coverage-linked-source" href={objective.linkedSource.readerHref || "/library"}>{objective.linkedSource.bookTitle || objective.linkedSource.filename}{objective.linkedSource.sectionLabel ? ` · ${objective.linkedSource.sectionLabel}` : ""}{objective.linkedSource.pageRange ? ` · pp. ${objective.linkedSource.pageRange}` : ""} <span>{objective.linkedSource.searchablePages} pages indexed →</span></a> : null}{messages[objective.id] ? <small>{messages[objective.id]}</small> : null}<div className="coverage-evidence-chain"><span><small>Lesson</small><strong>{objective.lessonLinks.length ? `${objective.learningEvidence.completedLessons}/${objective.lessonLinks.length} complete` : "Not prepared"}</strong>{objective.lessonLinks.map((lesson) => <a href={lesson.href} key={lesson.slug}>{lesson.title}{lesson.draft ? " · draft" : ""}</a>)}</span><span><small>Recall</small><strong>{objective.learningEvidence.reviewedCards}/{objective.learningEvidence.recallCards} reviewed</strong><a href="/review">Open memory queue</a></span><span><small>Questions</small><strong>{objective.questionSummary.approved} approved · {objective.questionSummary.pending} pending</strong><a href="/question-studio">Open review gate</a></span><span className={objective.gaps.length ? "has-gaps" : "is-complete"}><small>Remaining gaps</small><strong>{objective.gaps.length || "None"}</strong>{objective.gaps.slice(0, 3).map((gap) => <em key={gap}>{gap}</em>)}</span></div></div>
            <div className="coverage-action">
              {objective.stage === "lesson_ready" ? <><span>✓</span><strong>Lesson draft prepared</strong><small>Human source review remains required.</small><details><summary>Preview outline</summary><ol>{draftSections(objective.draft).map((label) => <li key={label}>{label}</li>)}</ol></details>{objective.linkedSource?.searchablePages ? <a href="/question-studio">Create question drafts →</a> : null}</>
                : objective.decision === "approved" ? <>{matchingSections.length ? <select aria-label={`Source section for ${objective.topic}`} value={selectedSources[objective.id] ?? ""} onChange={(event) => setSelectedSources((current) => ({ ...current, [objective.id]: event.target.value }))}><option value="">Choose the matching book section</option>{matchingSections.map((section) => <option value={section.id} key={section.id}>{bookSectionLabel(section)}</option>)}</select> : <a href="/library">Upload a Book section →</a>}<button type="button" disabled={working === objective.id || !selectedSources[objective.id]} onClick={() => createDraft(objective.id)}>{working === objective.id ? "Preparing…" : "Create lesson draft"}<span>→</span></button><small>The chosen section is locked to this draft for review.</small></>
                : <><a href={`/alignment#alignment-table`}>Review mapping →</a><small>{objective.stage === "missing_source" ? "A direct source or lecturer case set is still needed." : "Approve the route before preparing a lesson."}</small></>}
            </div>
          </article>;
          })}
        </div>
      </section>

      <section className="coverage-trust"><span>⌁</span><div><strong>Draft generation has a source gate.</strong><p>Poh-tah-toh will only prepare a lesson outline after you approve the mapping and upload a matching book section. It does not invent textbook quotations.</p></div><a href="/library">Upload book section</a></section>
    </div>
  );
}
