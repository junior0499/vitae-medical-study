"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Source = { documentId: string; label: string; filename: string; subject: string; pageRange: string; searchablePages: number; role?: string; decision?: string };
type Objective = { id: string; topic: string; subject: string; system: string; primary: Source };
type SourceLink = { id: string; objectiveId: string; documentId: string; role: string; decision: string; reviewerNote: string; document: Source };
type Passage = { documentId: string; pageNumber: number; printedPage: string; quote: string; sourceLabel: string; readerHref: string };
type Comparison = { left: Passage[]; right: Passage[]; sharedTerms: string[]; leftOnlyTerms: string[]; rightOnlyTerms: string[]; flags: Array<{ kind: string; label: string; detail: string }> };
type Workspace = { eligibleObjectives: Objective[]; selectedObjective: Objective | null; sourceLinks: SourceLink[]; approvedSources: Source[]; availableSources: Source[]; comparison: Comparison | null; safety?: string };
const empty: Workspace = { eligibleObjectives: [], selectedObjective: null, sourceLinks: [], approvedSources: [], availableSources: [], comparison: null };

export function SourceCompareWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(empty);
  const [objectiveId, setObjectiveId] = useState("");
  const [supportId, setSupportId] = useState("");
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Loading approved source links…");
  const [saving, setSaving] = useState("");

  const load = useCallback(async (nextObjective = "", compare?: { left: string; right: string }) => {
    const params = new URLSearchParams(); if (nextObjective) params.set("objective", nextObjective); if (compare?.left) params.set("left", compare.left); if (compare?.right) params.set("right", compare.right);
    const response = await fetch(`/api/source-comparison${params.size ? `?${params}` : ""}`); const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Source comparison could not be loaded.");
    setWorkspace(data); setObjectiveId(data.selectedObjective?.id ?? "");
    setNotes(Object.fromEntries((data.sourceLinks ?? []).map((link: SourceLink) => [link.id, link.reviewerNote ?? ""])));
    const approved = data.approvedSources ?? [];
    setLeftId((current) => approved.some((source: Source) => source.documentId === current) ? current : approved[0]?.documentId ?? "");
    setRightId((current) => approved.some((source: Source) => source.documentId === current) && current !== (approved[0]?.documentId ?? "") ? current : approved[1]?.documentId ?? "");
    setMessage(data.selectedObjective ? data.safety : "Approve an objective mapping, link its lesson draft, and deep-index the primary Book section first.");
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/source-comparison").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Source comparison could not be loaded."); return data; }).then((data) => {
      if (!active) return;
      setWorkspace(data); setObjectiveId(data.selectedObjective?.id ?? "");
      setNotes(Object.fromEntries((data.sourceLinks ?? []).map((link: SourceLink) => [link.id, link.reviewerNote ?? ""])));
      const approved = data.approvedSources ?? [];
      setLeftId(approved[0]?.documentId ?? ""); setRightId(approved[1]?.documentId ?? "");
      setMessage(data.selectedObjective ? data.safety : "Approve an objective mapping, link its lesson draft, and deep-index the primary Book section first.");
    }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Source comparison could not be loaded."); });
    return () => { active = false; };
  }, []);

  const approvedOptions = useMemo(() => workspace.approvedSources, [workspace.approvedSources]);
  async function attach() {
    if (!supportId) return; setSaving("attach"); setMessage("Attaching the support book for review…");
    try { const response = await fetch("/api/source-comparison", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ objectiveId, documentId: supportId }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "The source could not be attached."); setSupportId(""); await load(objectiveId); setMessage("Support book attached. Review and approve it before comparison."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The source could not be attached."); } finally { setSaving(""); }
  }
  async function review(link: SourceLink, decision: "approved" | "changes_requested") {
    setSaving(link.id); setMessage("Saving the support-source review…");
    try { const response = await fetch("/api/source-comparison", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: link.id, decision, reviewerNote: notes[link.id] ?? "" }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "The review could not be saved."); await load(objectiveId); setMessage(decision === "approved" ? "Support book approved. It can now be compared and used by the reasoning ladder." : "Changes requested. The book remains excluded from comparison."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The review could not be saved."); } finally { setSaving(""); }
  }
  async function compare() {
    if (!leftId || !rightId || leftId === rightId) { setMessage("Choose two different approved books."); return; }
    setSaving("compare"); setMessage("Comparing the closest objective-matched passages…");
    try { await load(objectiveId, { left: leftId, right: rightId }); setMessage("Comparison ready. Flags are prompts for human review, not automatic verdicts."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The books could not be compared."); } finally { setSaving(""); }
  }

  return <div className="source-compare-page">
    <header className="source-compare-hero"><div><span className="eyebrow"><i /> Two approved books · one objective</span><h1>Compare the passages.<br />Keep the context.</h1><p>Match two indexed book sections to the same syllabus objective, inspect their exact passages side by side, and treat detected differences as questions for review—not declarations that one source is wrong.</p></div><div><strong>{workspace.approvedSources.length}<small>approved sources</small></strong><p>{workspace.approvedSources.length >= 2 ? "This objective is ready for comparison." : "Attach and approve one support book to compare."}</p></div></header>
    <section className="source-compare-controls"><label><span>Syllabus objective</span><select value={objectiveId} onChange={(event) => { const value = event.target.value; setObjectiveId(value); setMessage("Loading this objective’s approved books…"); load(value).catch((error) => setMessage(error instanceof Error ? error.message : "The objective could not be loaded.")); }}><option value="">Choose an objective</option>{workspace.eligibleObjectives.map((objective) => <option value={objective.id} key={objective.id}>{objective.system} · {objective.topic}</option>)}</select></label>{workspace.selectedObjective ? <div><span>Approved primary</span><strong>{workspace.selectedObjective.primary.label}</strong><small>{workspace.selectedObjective.primary.searchablePages} searchable pages</small></div> : null}</section>
    {workspace.selectedObjective ? <><section className="support-source-panel"><header><div><span className="eyebrow">Support-source gate</span><h2>Attach another indexed book</h2></div><span>{workspace.sourceLinks.length} attached</span></header><div className="support-source-add"><select value={supportId} onChange={(event) => setSupportId(event.target.value)}><option value="">Choose another Book section</option>{workspace.availableSources.map((source) => <option value={source.documentId} key={source.documentId}>{source.label}</option>)}</select><button type="button" onClick={attach} disabled={!supportId || saving === "attach"}>{saving === "attach" ? "Attaching…" : "Attach for review"}</button></div>{workspace.sourceLinks.length ? <div className="support-source-list">{workspace.sourceLinks.map((link) => <article key={link.id}><div><span className={`source-decision is-${link.decision}`}>{link.decision.replace("_", " ")}</span><strong>{link.document.label}</strong><small>{link.document.searchablePages} searchable pages</small></div><textarea value={notes[link.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [link.id]: event.target.value }))} placeholder="Edition, scope, or approval note…" /><footer><button type="button" onClick={() => review(link, "changes_requested")} disabled={saving === link.id}>Request changes</button><button type="button" onClick={() => review(link, "approved")} disabled={saving === link.id}>Approve support book</button></footer></article>)}</div> : <p className="support-source-empty">No support book is attached to this objective yet. Only indexed Book sections appear in the selector.</p>}</section>
      <section className="compare-picker"><label><span>Book A</span><select value={leftId} onChange={(event) => setLeftId(event.target.value)}><option value="">Choose approved source</option>{approvedOptions.map((source) => <option value={source.documentId} key={source.documentId}>{source.label}</option>)}</select></label><span aria-hidden="true">↔</span><label><span>Book B</span><select value={rightId} onChange={(event) => setRightId(event.target.value)}><option value="">Choose approved source</option>{approvedOptions.map((source) => <option value={source.documentId} key={source.documentId}>{source.label}</option>)}</select></label><button type="button" onClick={compare} disabled={approvedOptions.length < 2 || saving === "compare"}>{saving === "compare" ? "Comparing…" : "Compare approved passages"}</button></section>
      {workspace.comparison ? <section className="comparison-result"><div className="comparison-columns">{(["left", "right"] as const).map((side) => <article key={side}><header><span>Book {side === "left" ? "A" : "B"}</span><strong>{approvedOptions.find((source) => source.documentId === (side === "left" ? leftId : rightId))?.label}</strong></header>{workspace.comparison?.[side].map((passage, index) => <blockquote key={`${passage.documentId}:${passage.pageNumber}:${index}`}><span>Matched passage {index + 1}</span><p>{passage.quote}</p><a href={passage.readerHref}>{passage.sourceLabel} ↗</a></blockquote>)}</article>)}</div><div className="comparison-language"><article><span>Shared emphasis</span><p>{workspace.comparison.sharedTerms.length ? workspace.comparison.sharedTerms.join(" · ") : "No strong shared terms beyond the objective wording."}</p></article><article><span>Book A emphasis</span><p>{workspace.comparison.leftOnlyTerms.length ? workspace.comparison.leftOnlyTerms.join(" · ") : "No distinct terms detected."}</p></article><article><span>Book B emphasis</span><p>{workspace.comparison.rightOnlyTerms.length ? workspace.comparison.rightOnlyTerms.join(" · ") : "No distinct terms detected."}</p></article></div><div className="comparison-flags">{workspace.comparison.flags.map((flag) => <article className={`is-${flag.kind}`} key={`${flag.kind}:${flag.label}`}><span>{flag.kind === "none" ? "✓" : "!"}</span><div><strong>{flag.label}</strong><p>{flag.detail}</p></div></article>)}</div></section> : null}</> : <section className="source-compare-empty"><span>35</span><h2>Comparison begins after source approval.</h2><p>{message}</p><a href="/alignment">Review source mappings →</a></section>}
    <p className="source-compare-status" role="status">{message}</p>
  </div>;
}
