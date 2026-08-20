"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type EligibleObjective = { id: string; subject: string; system: string; topic: string; lessonSlug: string; sourceDocumentId: string; sourceLabel: string; searchablePages: number };
type Question = { id: string; objectiveId: string; documentId: string; pageNumber: number; printedPage: string; questionType: string; prompt: string; options: string[]; answer: string; explanation: string; sourceQuote: string; status: string; reviewerNote: string; readerHref: string };
type Summary = { total: number; pending: number; approved: number; changesRequested: number };

const typeLabels: Record<string, string> = { mcq: "MCQ", saq: "SAQ", viva: "Viva", clinical_case: "Clinical case" };

export function QuestionStudioWorkspace() {
  const [eligible, setEligible] = useState<EligibleObjective[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, pending: 0, approved: 0, changesRequested: 0 });
  const [objectiveId, setObjectiveId] = useState("");
  const [types, setTypes] = useState(["mcq", "saq", "viva", "clinical_case"]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [state, setState] = useState<"idle" | "working" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/generated-questions");
    if (!response.ok) return;
    const data = await response.json();
    setEligible(data.eligibleObjectives ?? []); setQuestions(data.questions ?? []); if (data.summary) setSummary(data.summary);
    setObjectiveId((current) => current || data.eligibleObjectives?.[0]?.id || "");
    setNotes(Object.fromEntries((data.questions ?? []).map((question: Question) => [question.id, question.reviewerNote ?? ""])));
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/generated-questions").then((response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !data) return;
      setEligible(data.eligibleObjectives ?? []); setQuestions(data.questions ?? []); if (data.summary) setSummary(data.summary);
      setObjectiveId(data.eligibleObjectives?.[0]?.id || "");
      setNotes(Object.fromEntries((data.questions ?? []).map((question: Question) => [question.id, question.reviewerNote ?? ""])));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const selected = eligible.find((objective) => objective.id === objectiveId);
  const visible = useMemo(() => questions.filter((question) => filter === "all" || question.status === filter), [filter, questions]);

  function toggleType(type: string) {
    setTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  }

  async function generate() {
    if (!objectiveId || !types.length) { setState("error"); setMessage("Choose an eligible objective and at least one question type."); return; }
    setState("working"); setMessage("Finding the closest approved passage and preparing review drafts…");
    try {
      const response = await fetch("/api/generated-questions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ objectiveId, types }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Question drafts could not be created.");
      setState("success"); setMessage(`${data.questions?.length ?? 0} source-backed drafts are waiting for your review.`); await load();
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "Question drafts could not be created."); }
  }

  async function review(question: Question, status: "approved" | "changes_requested") {
    setState("working"); setMessage(status === "approved" ? "Verifying the exact source passage before approval…" : "Saving your review note…");
    try {
      const response = await fetch("/api/generated-questions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: question.id, status, reviewerNote: notes[question.id] ?? "" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The review could not be saved.");
      setState("success"); setMessage(status === "approved" ? "Question approved with its passage still verified." : "Changes requested. Regenerate after checking your note."); await load();
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "The review could not be saved."); }
  }

  return <div className="question-studio-page">
    <header className="question-studio-hero"><div><span className="eyebrow"><i /> Recommendation 32 · Approved-source questions</span><h1>Turn one exact passage<br />into questions you can trust.</h1><p>Poh-tah-toh prepares MCQ, SAQ, viva, and clinical-case drafts only when the objective, uploaded section, deep index, and mapping are approved. Every draft waits for your review.</p><a className="primary-button primary-button--dark" href="/question-quality">Inspect question quality <span>→</span></a></div><div className="question-studio-metrics"><span><strong>{summary.pending}</strong><small>awaiting review</small></span><span><strong>{summary.approved}</strong><small>approved</small></span><span><strong>{eligible.length}</strong><small>eligible objectives</small></span></div></header>

    <section className="question-generator" aria-labelledby="question-generator-title"><header><div><span className="eyebrow">Source gate</span><h2 id="question-generator-title">Prepare a review batch</h2></div><span>Exact page required</span></header>{eligible.length ? <div className="question-generator-grid"><label><span>Syllabus objective</span><select value={objectiveId} onChange={(event) => setObjectiveId(event.target.value)}>{eligible.map((objective) => <option value={objective.id} key={objective.id}>{objective.subject} · {objective.topic}</option>)}</select></label><fieldset><legend>Question types</legend>{Object.entries(typeLabels).map(([type, label]) => <label key={type}><input type="checkbox" checked={types.includes(type)} onChange={() => toggleType(type)} />{label}</label>)}</fieldset><button type="button" onClick={generate} disabled={state === "working"}>{state === "working" ? "Preparing…" : "Create source-backed drafts"}<span>→</span></button>{selected ? <aside><strong>{selected.sourceLabel}</strong><small>{selected.searchablePages} searchable pages · mapped to {selected.system}</small></aside> : null}</div> : <div className="question-gate-empty"><span>⌁</span><div><strong>No objective has passed all four gates yet.</strong><p>Approve a mapping, upload its exact Book section, create the lesson draft, and build the deep index.</p></div><a href="/coverage">Open objective coverage →</a></div>}{message ? <p className={`question-studio-message question-studio-message--${state}`} role="status">{message}</p> : null}</section>

    <section className="question-review" aria-labelledby="question-review-title"><header className="section-header"><div><span className="eyebrow">Human review gate</span><h2 id="question-review-title">Question drafts</h2></div><label><span className="sr-only">Filter question status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All {summary.total}</option><option value="pending_review">Awaiting review {summary.pending}</option><option value="approved">Approved {summary.approved}</option><option value="changes_requested">Changes requested {summary.changesRequested}</option></select></label></header><div className="question-review-grid">{visible.map((question) => <article key={question.id}><header><span>{typeLabels[question.questionType] ?? question.questionType}</span><b className={`question-status question-status--${question.status}`}>{question.status.replaceAll("_", " ")}</b></header><h3>{question.prompt}</h3>{question.options.length ? <ol>{question.options.map((option) => <li key={option}>{option}</li>)}</ol> : null}<details><summary>Show proposed answer</summary><p>{question.answer}</p><small>{question.explanation}</small></details><blockquote>{question.sourceQuote}</blockquote><a href={question.readerHref}>Open exact {question.printedPage ? `page ${question.printedPage}` : `PDF page ${question.pageNumber}`} →</a><label><span>Review note</span><textarea value={notes[question.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="What should change before approval?" maxLength={1000} /></label><footer><button type="button" onClick={() => review(question, "changes_requested")} disabled={state === "working"}>Request changes</button><button type="button" onClick={() => review(question, "approved")} disabled={state === "working"}>Approve verified draft</button></footer></article>)}</div>{!visible.length ? <div className="question-review-empty"><span>◇</span><p>No question drafts match this filter.</p></div> : null}</section>
  </div>;
}
