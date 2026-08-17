"use client";

import { useCallback, useEffect, useState } from "react";

type Objective = { id: string; topic: string; subject: string; system: string; supportCount: number; completedStages: number };
type Evidence = { documentId: string; pageNumber: number; printedPage: string; quote: string; sourceLabel: string; readerHref: string };
type Stage = { key: string; label: string; shortLabel: string; prompt: string; state: "complete" | "ready" | "locked" | "gap" | "stale"; noteText: string; evidence: Evidence | null };
type Workspace = { eligibleObjectives: Objective[]; selectedObjective: Objective | null; stages: Stage[]; sources: Array<{ documentId: string; role: string; label: string }>; summary: { complete: number; ready: number; gaps: number }; safety?: string };
const empty: Workspace = { eligibleObjectives: [], selectedObjective: null, stages: [], sources: [], summary: { complete: 0, ready: 0, gaps: 0 } };

export function ReasoningLadderWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(empty);
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Loading approved reasoning evidence…");
  const [saving, setSaving] = useState("");

  const load = useCallback(async (objectiveId = "") => {
    const response = await fetch(`/api/reasoning-ladder${objectiveId ? `?objective=${encodeURIComponent(objectiveId)}` : ""}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "The ladder could not be loaded.");
    setWorkspace(data); setSelectedId(data.selectedObjective?.id ?? "");
    setNotes(Object.fromEntries((data.stages ?? []).map((stage: Stage) => [stage.key, stage.noteText ?? ""])));
    setMessage(data.selectedObjective ? data.safety : "Approve a source mapping, create its lesson draft, and build its deep index to unlock a reasoning ladder.");
  }, []);

  useEffect(() => {
    let active = true;
    const initialObjective = new URLSearchParams(window.location.search).get("objective") ?? "";
    fetch(`/api/reasoning-ladder${initialObjective ? `?objective=${encodeURIComponent(initialObjective)}` : ""}`).then(async (response) => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "The ladder could not be loaded."); return data;
    }).then((data) => {
      if (!active) return;
      setWorkspace(data); setSelectedId(data.selectedObjective?.id ?? "");
      setNotes(Object.fromEntries((data.stages ?? []).map((stage: Stage) => [stage.key, stage.noteText ?? ""])));
      setMessage(data.selectedObjective ? data.safety : "Approve a source mapping, create its lesson draft, and build its deep index to unlock a reasoning ladder.");
    }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "The ladder could not be loaded."); });
    return () => { active = false; };
  }, []);

  async function complete(stage: Stage) {
    setSaving(stage.key); setMessage("Saving your reasoning link with its exact source passage…");
    try {
      const response = await fetch("/api/reasoning-ladder", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ objectiveId: selectedId, stageKey: stage.key, noteText: notes[stage.key] ?? "" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The stage could not be completed.");
      await load(selectedId); setMessage("Stage completed. The next supported reasoning step is now available.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The stage could not be completed."); }
    finally { setSaving(""); }
  }

  return <div className="reasoning-page">
    <header className="reasoning-hero"><div><span className="eyebrow"><i /> Six linked decisions · exact evidence</span><h1>Reason from normal.<br />Never jump to management.</h1><p>Move through physiology, mechanism, symptoms, examination, investigation, and management. Each step stays locked until the previous connection is explained and a matching approved passage exists.</p></div><div><strong>{workspace.summary.complete}<small>/ 6 stages complete</small></strong><p>{workspace.summary.gaps ? `${workspace.summary.gaps} source ${workspace.summary.gaps === 1 ? "gap needs" : "gaps need"} attention.` : "Every current stage has matching evidence."}</p></div></header>
    <section className="reasoning-controls"><label><span>Syllabus objective</span><select value={selectedId} onChange={(event) => { const value = event.target.value; setSelectedId(value); setMessage("Loading the selected reasoning chain…"); load(value).catch((error) => setMessage(error instanceof Error ? error.message : "The ladder could not be loaded.")); }}><option value="">Choose an approved objective</option>{workspace.eligibleObjectives.map((objective) => <option value={objective.id} key={objective.id}>{objective.system} · {objective.topic}</option>)}</select></label>{workspace.selectedObjective ? <div><span>{workspace.selectedObjective.subject}</span><strong>{workspace.selectedObjective.topic}</strong><small>{workspace.sources.length} approved {workspace.sources.length === 1 ? "source" : "sources"}</small></div> : null}</section>
    {workspace.stages.length ? <section className="reasoning-ladder" aria-label="Clinical reasoning stages">{workspace.stages.map((stage, index) => <article className={`reasoning-stage is-${stage.state}`} key={stage.key}><header><span>{String(index + 1).padStart(2, "0")}</span><div><small>{stage.state === "complete" ? "Completed" : stage.state === "ready" ? "Ready now" : stage.state === "gap" ? "Source gap" : stage.state === "stale" ? "Evidence changed" : "Complete earlier stage"}</small><h2>{stage.label}</h2></div><i aria-hidden="true">{stage.state === "complete" ? "✓" : stage.state === "gap" || stage.state === "stale" ? "!" : "→"}</i></header><p className="reasoning-prompt">{stage.prompt}</p>{stage.evidence ? <blockquote><span>Approved passage</span><p>{stage.evidence.quote}</p><a href={stage.evidence.readerHref}>{stage.evidence.sourceLabel} ↗</a></blockquote> : <aside><strong>No matching approved passage</strong><p>Attach a focused indexed Book section or approve a support source. Poh-tah-toh will not invent this clinical step.</p><a href="/source-compare">Attach another approved book →</a></aside>}{stage.state !== "gap" && stage.state !== "locked" ? <label><span>Your reasoning link</span><textarea value={notes[stage.key] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [stage.key]: event.target.value }))} disabled={stage.state === "complete"} placeholder="Explain how this passage connects to the previous stage in your own words…" />{stage.state === "complete" ? <small>Saved with the cited passage.</small> : <button type="button" onClick={() => complete(stage)} disabled={saving === stage.key}>{saving === stage.key ? "Saving…" : stage.state === "stale" ? "Reconfirm with current evidence" : "Complete stage"}</button>}</label> : null}</article>)}</section> : <section className="reasoning-empty"><span>33</span><h2>The ladder is ready for your approved sources.</h2><p>{message}</p><div><a href="/alignment">Review source mappings</a><a href="/library">Open source library</a></div></section>}
    {workspace.stages.length ? <p className="reasoning-status" role="status">{message}</p> : null}
  </div>;
}
