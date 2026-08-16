"use client";

import { useEffect, useMemo, useState } from "react";
import { enqueueOfflineAction, saveTravelPack } from "@/lib/offline-client";

export type LessonStep = {
  stage: string;
  title: string;
  cue: string;
  detail: string;
  connect: string;
  hint?: string;
  check?: string;
};

export type RecallQuestion = {
  q: string;
  a: string;
  hint?: string;
  options?: string[];
  followUp?: string;
};

type SourceReference = {
  id: string;
  role: string;
  shortTitle: string;
  title: string;
  edition: string;
  chapter: string;
  pageReference: string;
  note: string;
  decision: "pending" | "approved" | "changes_requested";
};

type ProfessorLessonWorkspaceProps = {
  lessonSlug: string;
  title: string;
  subtitle: string;
  notesLabel: string;
  notesPlaceholder: string;
  mapTitle: string;
  steps: LessonStep[];
  recallQuestions: RecallQuestion[];
  nextLesson?: { href: string; label: string };
};

type NoteMapNode = { label: string; detail: string };

function buildNoteNodes(content: string): NoteMapNode[] {
  const lines = content.split(/\n+|(?<=[.!?])\s+/).map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter((line) => line.length >= 8);
  return lines.slice(0, 8).map((line, index) => {
    const [heading, ...rest] = line.split(":");
    const words = heading.split(/\s+/);
    const label = (rest.length ? heading : words.slice(0, 5).join(" ")).slice(0, 60);
    const detail = (rest.length ? rest.join(":").trim() : line).slice(0, 220);
    return { label: label || `Point ${index + 1}`, detail };
  });
}

export function ProfessorLessonWorkspace({
  lessonSlug, title, subtitle, notesLabel, notesPlaceholder, mapTitle, steps, recallQuestions, nextLesson,
}: ProfessorLessonWorkspaceProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedPoints, setCompletedPoints] = useState(0);
  const [notes, setNotes] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "offline" | "error">("idle");
  const [revealed, setRevealed] = useState<number[]>([]);
  const [stepHelp, setStepHelp] = useState<Record<number, number>>({});
  const [recallHelp, setRecallHelp] = useState<Record<number, number>>({});
  const [reviewState, setReviewState] = useState<Record<number, string>>({});
  const [reviewSaving, setReviewSaving] = useState<number | null>(null);
  const [sources, setSources] = useState<SourceReference[]>([]);
  const [sourceMode, setSourceMode] = useState("Loading the approved reading route…");
  const [noteMap, setNoteMap] = useState<NoteMapNode[]>([]);
  const [mapState, setMapState] = useState("");
  const [travelState, setTravelState] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/notes?lesson=${lessonSlug}`).then((response) => response.ok ? response.json() : null),
      fetch("/api/progress").then((response) => response.ok ? response.json() : null),
      fetch(`/api/lesson-sources?lesson=${lessonSlug}`).then((response) => response.ok ? response.json() : null),
      fetch(`/api/mind-maps?lesson=${lessonSlug}`).then((response) => response.ok ? response.json() : null),
    ]).then(([notesData, progressData, sourceData, mapData]) => {
      if (!active) return;
      const localDraft = window.localStorage.getItem(`vitae-note-draft:${lessonSlug}`) ?? "";
      if (notesData?.note?.content) setNotes(notesData.note.content);
      else if (localDraft) { setNotes(localDraft); setSaveState("offline"); }
      const saved = progressData?.progress?.find((row: { lessonSlug: string }) => row.lessonSlug === lessonSlug);
      if (saved) {
        setCompletedPoints(saved.completedPoints);
        setActiveStep(Math.min(saved.completedPoints, steps.length - 1));
      }
      if (sourceData?.sources) setSources(sourceData.sources);
      if (sourceData?.sourceMode) setSourceMode(sourceData.sourceMode);
      else setSourceMode("Reading references are unavailable right now; the professor explanation remains clearly labeled.");
      const savedMap = mapData?.maps?.[0];
      if (savedMap?.nodesJson) {
        try { setNoteMap(JSON.parse(savedMap.nodesJson) as NoteMapNode[]); } catch { /* Ignore malformed historic maps. */ }
      }
    }).catch(() => setSourceMode("Reading references are unavailable right now; the professor explanation remains clearly labeled."));
    return () => { active = false; };
  }, [lessonSlug, steps.length]);

  const progressPercent = Math.round((completedPoints / steps.length) * 100);
  const step = steps[activeStep];
  const complete = completedPoints >= steps.length;
  const nextLabel = activeStep === steps.length - 1 ? "Finish foundation" : "Teach next point";
  const mapProgress = useMemo(() => Math.max(completedPoints, activeStep), [activeStep, completedPoints]);
  const approvedSources = sources.filter((source) => source.decision === "approved").length;

  async function persistProgress(points: number) {
    setCompletedPoints(points);
    const body = { lessonSlug, completedPoints: points, totalPoints: steps.length, status: points >= steps.length ? "complete" : "in_progress" };
    try {
      const response = await fetch("/api/progress", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error("Progress save failed.");
    } catch { enqueueOfflineAction("/api/progress", "PUT", body); }
  }

  async function advance() {
    const nextPoints = Math.max(completedPoints, Math.min(activeStep + 1, steps.length));
    await persistProgress(nextPoints);
    if (activeStep < steps.length - 1) setActiveStep((current) => current + 1);
  }

  async function saveNotes() {
    setSaveState("saving");
    const body = { lessonSlug, content: notes };
    try {
      const response = await fetch("/api/notes", {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Note save failed.");
      window.localStorage.removeItem(`vitae-note-draft:${lessonSlug}`);
      setSaveState("saved");
      const nodes = buildNoteNodes(notes);
      if (nodes.length >= 2) await persistMindMap(nodes, false);
    } catch {
      window.localStorage.setItem(`vitae-note-draft:${lessonSlug}`, notes);
      enqueueOfflineAction("/api/notes", "PUT", body);
      setSaveState("offline");
    }
  }

  async function persistMindMap(nodes: NoteMapNode[], announce = true) {
    if (nodes.length < 2) { setMapState("Write at least two clear note lines first."); return; }
    const body = { lessonSlug, title: mapTitle, nodes };
    setNoteMap(nodes);
    if (announce) setMapState("Building your map…");
    try {
      const response = await fetch("/api/mind-maps", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error("Map save failed.");
      setMapState(announce ? "Sideways map saved from your notes." : "Map updated automatically from your saved notes.");
    } catch {
      enqueueOfflineAction("/api/mind-maps", "PUT", body);
      setMapState("Map saved on this device and will sync when online.");
    }
  }

  async function prepareTravelLesson() {
    setTravelState("Preparing…");
    try {
      await saveTravelPack([`/learn/cardiovascular/${lessonSlug}`, "/learn", "/review", "/mistakes", "/maps", "/offline"]);
      setTravelState("Saved for travel");
    } catch { setTravelState("Could not save here"); }
  }

  async function rateRecall(index: number, item: RecallQuestion, rating: "again" | "hard" | "good") {
    setReviewSaving(index);
    setReviewState((current) => ({ ...current, [index]: "Scheduling…" }));
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lessonSlug,
          questionKey: `recall-${index + 1}`,
          question: item.q,
          answer: item.a,
          rating,
        }),
      });
      if (!response.ok) throw new Error("Review could not be scheduled.");
      const labels = { again: "Back in about 10 minutes", hard: "Kept close for another review", good: "Scheduled at a longer interval" };
      setReviewState((current) => ({ ...current, [index]: labels[rating] }));
    } catch {
      enqueueOfflineAction("/api/reviews", "POST", { lessonSlug, questionKey: `recall-${index + 1}`, question: item.q, answer: item.a, rating });
      setReviewState((current) => ({ ...current, [index]: "Saved on this device; it will schedule when online." }));
    } finally {
      setReviewSaving(null);
    }
  }

  return (
    <div className="lesson-page">
      <header className="lesson-heading">
        <div><a href="/learn">← Clinical foundations</a><span className="eyebrow">Professor Mode · Foundation lesson</span><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="lesson-heading-actions"><button type="button" className="travel-lesson-button" onClick={prepareTravelLesson}>↓ {travelState || "Save for travel"}</button><div className="lesson-progress-card"><span><strong>{progressPercent}%</strong><small>lesson complete</small></span><div><i style={{ width: `${progressPercent}%` }} /></div><b>{complete ? "Foundation complete" : `${steps.length - completedPoints} points remaining`}</b></div></div>
      </header>

      <section className="lesson-source-trail" aria-labelledby="lesson-source-title">
        <header><div><span className="eyebrow">Step 8 · Traceable lesson</span><h2 id="lesson-source-title">Source trail</h2></div><span className={approvedSources ? "source-approval source-approval--approved" : "source-approval"}>{approvedSources ? `${approvedSources} approved` : "Awaiting review"}</span></header>
        <p className="source-mode-note"><strong>Professor explanation:</strong> {sourceMode}</p>
        <div className="source-reference-grid">
          {sources.length ? sources.map((source) => (
            <article key={source.id}>
              <span className="source-reference-book">{source.shortTitle}</span>
              <div><small>{source.role}</small><strong>{source.title} · {source.edition}</strong><p>{source.chapter} · {source.pageReference}</p><em>{source.note}</em></div>
              <b className={`source-decision source-decision--${source.decision}`}>{source.decision === "approved" ? "Approved route" : source.decision === "changes_requested" ? "Change flagged" : "Review pending"}</b>
            </article>
          )) : <p className="source-empty">The source route is loading. The lesson remains usable without opening a full PDF.</p>}
        </div>
        <footer><span>Chapter and page entries are reading pointers, not quotations.</span><a href="/alignment#foundation-map-title">Review mapping →</a></footer>
      </section>

      <section className="mind-map" aria-labelledby="mind-map-title">
        <header><div><span className="eyebrow">Sideways concept map</span><h2 id="mind-map-title">{mapTitle}</h2></div><small>Choose any node to revisit it</small></header>
        <div className="mind-map-track" role="list">
          {steps.map((item, index) => (
            <button className={`${index === activeStep ? "is-active" : ""} ${index < mapProgress ? "is-complete" : ""}`} type="button" key={`${item.stage}-${index}`} onClick={() => setActiveStep(index)}>
              <span>{index < completedPoints ? "✓" : index + 1}</span><b>{item.stage}</b><small>{item.title}</small>{index < steps.length - 1 ? <i aria-hidden="true">→</i> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="lesson-grid">
        <article className="professor-card">
          <header><div className="professor-avatar"><span>Prof.</span><b>V</b></div><div><span className="eyebrow">Adaptive Professor Mode · Point {activeStep + 1} of {steps.length}</span><h2>{step.title}</h2></div><span className="teaching-live"><i /> Professor explanation</span></header>
          <div className="professor-cue"><span>Start here</span><blockquote>{step.cue}</blockquote></div>
          <div className="professor-detail"><span className="detail-number">{String(activeStep + 1).padStart(2, "0")}</span><div><h3>Walk through it</h3><p>{step.detail}</p>
            <div className="adaptive-help">
              <header><span>Adaptive help</span><small>Choose how much support you need.</small></header>
              <div><button type="button" className={stepHelp[activeStep] >= 1 ? "is-active" : ""} onClick={() => setStepHelp((current) => ({ ...current, [activeStep]: Math.max(current[activeStep] ?? 0, 1) }))}>Simplify this</button><button type="button" className={stepHelp[activeStep] >= 2 ? "is-active" : ""} onClick={() => setStepHelp((current) => ({ ...current, [activeStep]: Math.max(current[activeStep] ?? 0, 2) }))}>Check understanding</button></div>
              {stepHelp[activeStep] >= 1 ? <p><strong>Plain-language version:</strong> {step.hint ?? step.cue}</p> : null}
              {stepHelp[activeStep] >= 2 ? <p><strong>Quick check:</strong> {step.check ?? `Can you explain why “${step.title}” happens before moving on?`}</p> : null}
            </div>
            <aside><span aria-hidden="true">↗</span><p><strong>Clinical connection</strong>{step.connect}</p></aside></div></div>
          <footer><button className="lesson-back" type="button" disabled={activeStep === 0} onClick={() => setActiveStep((current) => Math.max(0, current - 1))}>← Previous</button><button className="lesson-next" type="button" onClick={advance}>{nextLabel}<span>→</span></button></footer>
        </article>

        <aside className="notes-card">
          <header><div><span className="eyebrow">Your notebook</span><h2>Make it yours</h2></div><span className={`save-state save-state--${saveState}`}>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "offline" ? "Saved offline" : saveState === "error" ? "Try again" : "Private"}</span></header>
          <p>Write the idea in your own words. Your notes are saved privately to this lesson.</p>
          <label htmlFor="lesson-notes">{notesLabel}</label>
          <textarea id="lesson-notes" value={notes} maxLength={30000} onChange={(event) => { setNotes(event.target.value); setSaveState("idle"); window.localStorage.setItem(`vitae-note-draft:${lessonSlug}`, event.target.value); }} placeholder={notesPlaceholder} />
          <div className="note-actions"><button type="button" onClick={saveNotes} disabled={saveState === "saving"}>Save notes <span>✓</span></button><button type="button" onClick={() => persistMindMap(buildNoteNodes(notes))}>Build sideways map <span>→</span></button></div>
          {mapState ? <p className="note-map-state" role="status">{mapState} <a href="/maps">Open maps</a></p> : null}
          <small>{notes.length.toLocaleString()} / 30,000 characters</small>
        </aside>
      </section>

      {noteMap.length >= 2 ? <section className="note-built-map" aria-labelledby="note-built-map-title"><header><div><span className="eyebrow">Automatic sideways mind map</span><h2 id="note-built-map-title">Built only from your notes</h2></div><a href="/maps">All saved maps →</a></header><div>{noteMap.map((node, index) => <article key={`${node.label}-${index}`}><span>{index + 1}</span><strong>{node.label}</strong><p>{node.detail}</p>{index < noteMap.length - 1 ? <i aria-hidden="true">→</i> : null}</article>)}</div></section> : null}

      <section id="recall" className="recall-section">
        <header className="section-header"><div><span className="eyebrow">Step 9 · Close the notes</span><h2>Active recall checkpoint</h2></div><span>{revealed.length} of {recallQuestions.length} revealed</span></header>
        <div className="recall-grid">{recallQuestions.map((item, index) => {
          const isRevealed = revealed.includes(index);
          const helpLevel = recallHelp[index] ?? 0;
          return <article className={isRevealed ? "is-revealed" : ""} key={item.q}>
            <span>Question {index + 1}</span><strong>{item.q}</strong>
            {!isRevealed ? <p>Answer aloud before using help.</p> : <div className="recall-answer"><small>Clean answer</small><p>{item.a}</p>{item.followUp ? <em>Push it further: {item.followUp}</em> : null}</div>}
            {!isRevealed ? <div className="recall-help-actions"><button type="button" onClick={() => setRecallHelp((current) => ({ ...current, [index]: Math.max(helpLevel, 1) }))}>Need a hint</button>{item.options?.length ? <button type="button" onClick={() => setRecallHelp((current) => ({ ...current, [index]: Math.max(helpLevel, 2) }))}>Show options</button> : null}</div> : null}
            {!isRevealed && helpLevel >= 1 ? <p className="recall-hint"><strong>Hint:</strong> {item.hint ?? "Return to the pressure, flow, or volume relationship taught above."}</p> : null}
            {!isRevealed && helpLevel >= 2 && item.options?.length ? <ol className="recall-options">{item.options.map((option) => <li key={option}>{option}</li>)}</ol> : null}
            <button className="recall-reveal" type="button" onClick={() => setRevealed((current) => isRevealed ? current.filter((value) => value !== index) : [...current, index])}>{isRevealed ? "Hide answer" : "Reveal answer"} →</button>
            {isRevealed ? <div className="recall-rating"><span>How did it feel?</span><button type="button" disabled={reviewSaving === index} onClick={() => rateRecall(index, item, "again")}>Again</button><button type="button" disabled={reviewSaving === index} onClick={() => rateRecall(index, item, "hard")}>Hard</button><button type="button" disabled={reviewSaving === index} onClick={() => rateRecall(index, item, "good")}>Good</button></div> : null}
            {reviewState[index] ? <small className="recall-scheduled">{reviewState[index]} · <a href="/review">Open queue</a></small> : null}
          </article>;
        })}</div>
      </section>

      {complete && nextLesson ? <section className="lesson-complete-banner"><span>✓</span><div><strong>This foundation is complete.</strong><p>Your progress and notes are saved. Continue while the connection is fresh.</p></div><a href={nextLesson.href}>{nextLesson.label} →</a></section> : null}
    </div>
  );
}
