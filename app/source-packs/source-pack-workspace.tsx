"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Objective = { id: string; subject: string; system: string; topic: string; gate: string; sourceName: string; searchablePages: number };
type Candidate = { documentId: string; pageNumber: number; printedPage: string; quote: string; sourceLabel: string; readerHref: string; savedCitation: boolean };
type Pack = { id: string; objectiveId: string; title: string; sourceLabel: string; sourceQuote: string; status: string; reviewerNote: string; readerHref: string; artifacts: { lesson?: { state?: string }; recall?: { state?: string }; clinicalCase?: { state?: string }; viva?: { state?: string }; visibleGaps?: string[] } };

export function SourcePackWorkspace() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [objectiveId, setObjectiveId] = useState("");
  const [candidateIndex, setCandidateIndex] = useState(-1);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Loading approved source routes…");

  const load = useCallback(async (selectedObjective = "") => {
    const query = selectedObjective ? `?objectiveId=${encodeURIComponent(selectedObjective)}` : "";
    const response = await fetch(`/api/source-packs${query}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Source packs could not be loaded.");
    setObjectives(data.objectives ?? []); setPacks(data.packs ?? []); setCandidates(data.candidates ?? []); setCandidateIndex(-1); setNotes(Object.fromEntries((data.packs ?? []).map((pack: Pack) => [pack.id, pack.reviewerNote])));
    if (!selectedObjective && !objectiveId) {
      const first = (data.objectives ?? []).find((item: Objective) => item.gate === "eligible");
      if (first) { setObjectiveId(first.id); setTitle(first.topic); }
    }
    setMessage("");
  }, [objectiveId]);

  useEffect(() => {
    let active = true;
    fetch("/api/source-packs").then((response) => response.ok ? response.json() : null).then((data) => { if (!active || !data) return; setObjectives(data.objectives ?? []); setPacks(data.packs ?? []); setNotes(Object.fromEntries((data.packs ?? []).map((pack: Pack) => [pack.id, pack.reviewerNote]))); const first = (data.objectives ?? []).find((item: Objective) => item.gate === "eligible"); if (first) { setObjectiveId(first.id); setTitle(first.topic); fetch(`/api/source-packs?objectiveId=${encodeURIComponent(first.id)}`).then((response) => response.ok ? response.json() : null).then((detail) => { if (active && detail) setCandidates(detail.candidates ?? []); }).catch(() => undefined); } setMessage(""); }).catch(() => { if (active) setMessage("Source packs could not be loaded."); });
    return () => { active = false; };
  }, []);

  const eligible = useMemo(() => objectives.filter((item) => item.gate === "eligible"), [objectives]);
  const selectedObjective = objectives.find((item) => item.id === objectiveId);
  const selectedCandidate = candidateIndex >= 0 ? candidates[candidateIndex] : null;

  async function chooseObjective(id: string) {
    setObjectiveId(id); setTitle(objectives.find((item) => item.id === id)?.topic ?? ""); setCandidateIndex(-1); setMessage("Loading exact indexed passages…");
    try { await load(id); } catch (error) { setMessage(error instanceof Error ? error.message : "Passages could not be loaded."); }
  }

  async function createPack() {
    if (!selectedCandidate) { setMessage("Choose one exact passage before preparing the pack."); return; }
    setMessage("Preparing a review-gated learning pack…");
    try {
      const response = await fetch("/api/source-packs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ objectiveId, pageNumber: selectedCandidate.pageNumber, sourceQuote: selectedCandidate.quote, title }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "The source pack could not be prepared.");
      setMessage("Pack prepared as a review draft. Clinical fields remain locked until you approve the exact passage."); await load(objectiveId);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The source pack could not be prepared."); }
  }

  async function review(pack: Pack, status: "approved" | "changes_requested") {
    setMessage("Saving the individual source review…");
    try {
      const response = await fetch("/api/source-packs", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: pack.id, status, reviewerNote: notes[pack.id] ?? "" }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "The source review could not be saved.");
      setMessage(status === "approved" ? "Exact passage approved. The illness-script workspace can now use this pack." : "Changes requested. Downstream clinical tools remain locked."); await load(objectiveId);
    } catch (error) { setMessage(error instanceof Error ? error.message : "The source review could not be saved."); }
  }

  return <div className="pack-page"><header className="pack-hero"><div><span className="eyebrow"><i /> Recommendation 51 · Source Pack Builder</span><h1>One section becomes<br />one reviewable learning route.</h1><p>Choose an approved syllabus objective, lock it to an exact indexed passage, and prepare the lesson, recall, case, and viva lanes without inventing unsupported clinical content.</p><a className="primary-button primary-button--dark" href="#pack-builder">Build a source pack <span>→</span></a></div><div><span><strong>{packs.length}</strong><small>prepared packs</small></span><span><strong>{packs.filter((item) => item.status === "approved").length}</strong><small>approved</small></span><span><strong>{eligible.length}</strong><small>eligible objectives</small></span></div></header>
    <section className="pack-flow" aria-label="Source pack flow"><article><span>01</span><strong>Approved objective</strong><p>The syllabus mapping and uploaded Book section must already be reviewed.</p></article><article><span>02</span><strong>Exact passage</strong><p>The quote must remain inside the indexed page and pass freshness checks.</p></article><article><span>03</span><strong>Learning scaffolds</strong><p>Lesson, recall, case, and viva lanes are prepared with visible gaps.</p></article><article><span>04</span><strong>Human approval</strong><p>Illness scripts stay locked until the passage is reviewed.</p></article></section>
    <section id="pack-builder" className="pack-builder"><header className="section-header"><div><span className="eyebrow">Build from evidence</span><h2>Objective to exact passage</h2></div><span>{objectives.length - eligible.length} objectives still gated</span></header><div className="pack-builder-grid"><label><span>Eligible syllabus objective</span><select value={objectiveId} onChange={(event) => chooseObjective(event.target.value)}><option value="">Choose an objective</option>{eligible.map((item) => <option value={item.id} key={item.id}>{item.subject} · {item.system} · {item.topic}</option>)}</select><small>{selectedObjective ? `${selectedObjective.sourceName} · ${selectedObjective.searchablePages} indexed pages` : "Approve a mapping, attach a Book section, and build its deep index first."}</small></label><label><span>Pack title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} placeholder="Name this source-locked learning pack" /></label></div><div className="pack-candidates">{candidates.map((candidate, index) => <button type="button" className={candidateIndex === index ? "is-selected" : ""} onClick={() => setCandidateIndex(index)} key={`${candidate.documentId}-${candidate.pageNumber}-${index}`}><header><span>{candidate.savedCitation ? "Saved exact citation" : "Indexed page"}</span><b>{candidate.printedPage ? `p. ${candidate.printedPage}` : `PDF page ${candidate.pageNumber}`}</b></header><blockquote>{candidate.quote}</blockquote><small>{candidate.sourceLabel}</small></button>)}{objectiveId && !candidates.length ? <p className="pack-empty">No indexed passage is available for this objective yet. Open the linked source and save an exact citation.</p> : null}</div>{selectedCandidate ? <aside className="pack-selection"><span>⌁</span><div><strong>Exact evidence selected</strong><p>{selectedCandidate.sourceLabel}</p></div><a href={selectedCandidate.readerHref}>Inspect page →</a></aside> : null}<button className="pack-create" type="button" disabled={!selectedCandidate || !title.trim()} onClick={createPack}>Prepare review draft <span>→</span></button></section>
    <section className="pack-inventory"><header className="section-header"><div><span className="eyebrow">Review gate</span><h2>Prepared source packs</h2></div><a href="/illness-scripts">Open illness scripts →</a></header><div>{packs.map((pack) => <article key={pack.id}><header><div><span>{pack.objectiveId}</span><h3>{pack.title}</h3></div><b className={`source-decision is-${pack.status}`}>{pack.status.replaceAll("_", " ")}</b></header><blockquote>{pack.sourceQuote}</blockquote><small>{pack.sourceLabel}</small><div className="pack-artifacts"><span><i>01</i><b>Lesson</b><small>{pack.artifacts.lesson?.state ?? "prepared"}</small></span><span><i>02</i><b>Recall</b><small>{pack.artifacts.recall?.state ?? "scaffold"}</small></span><span><i>03</i><b>Case</b><small>{pack.artifacts.clinicalCase?.state ?? "locked"}</small></span><span><i>04</i><b>Viva</b><small>{pack.artifacts.viva?.state ?? "scaffold"}</small></span></div><ul>{(pack.artifacts.visibleGaps ?? []).map((gap) => <li key={gap}>{gap}</li>)}</ul><label><span>Reviewer note</span><textarea value={notes[pack.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [pack.id]: event.target.value }))} placeholder="Why is this passage sufficient, or what must change?" /></label><footer><a href={pack.readerHref}>Verify exact page →</a><button type="button" onClick={() => review(pack, "changes_requested")}>Request changes</button><button type="button" onClick={() => review(pack, "approved")}>Approve pack</button></footer></article>)}{!packs.length ? <p className="pack-empty">No source pack has been prepared yet.</p> : null}</div></section>
    {message ? <p className="pack-message" role="status">{message}</p> : null}
  </div>;
}
