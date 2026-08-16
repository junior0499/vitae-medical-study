"use client";

import { useEffect, useState } from "react";

type EntityType = "note" | "mind_map" | "alignment_review" | "lesson_draft";
type Version = { id: string; entityType: EntityType; entityKey: string; action: string; summary: string; createdAt: string };
type HistoryData = { versions: Version[]; counts: Record<EntityType, number>; total: number };
const labels: Record<EntityType, string> = { note: "Lesson notes", mind_map: "Mind maps", alignment_review: "Source mappings", lesson_draft: "Lesson drafts" };
const emptyCounts = { note: 0, mind_map: 0, alignment_review: 0, lesson_draft: 0 };

export function HistoryWorkspace() {
  const [data, setData] = useState<HistoryData>({ versions: [], counts: emptyCounts, total: 0 });
  const [filter, setFilter] = useState<"all" | EntityType>("all");
  const [message, setMessage] = useState("");
  const [restoring, setRestoring] = useState("");
  async function load(type: "all" | EntityType) {
    try { const response = await fetch(`/api/history${type === "all" ? "" : `?type=${type}`}`); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "History could not be loaded."); setData(payload); }
    catch (error) { setMessage(error instanceof Error ? error.message : "History could not be loaded."); }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/history").then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "History could not be loaded.");
      return payload as HistoryData;
    }).then((payload) => { if (active) setData(payload); }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "History could not be loaded."); });
    return () => { active = false; };
  }, []);
  function choose(type: "all" | EntityType) { setFilter(type); void load(type); }
  async function restore(version: Version) {
    if (!window.confirm(`Restore this ${labels[version.entityType].toLowerCase()} version? A safety copy of the current version will be saved first.`)) return;
    setRestoring(version.id); setMessage("Saving a safety copy and restoring the selected version…");
    try { const response = await fetch("/api/history", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ versionId: version.id }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Version could not be restored."); setMessage(`${payload.label} restored. The previous state remains in history.`); await load(filter); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Version could not be restored."); }
    finally { setRestoring(""); }
  }
  return <div className="history-page"><header className="history-hero"><div><span className="eyebrow"><i /> Recommendation 24 · Learning history</span><h1>Return to an earlier idea<br />without losing the current one.</h1><p>Every future note, mind map, source-mapping decision, and lesson-draft save creates an owner-only version. Rollback first stores a safety copy of the current state.</p></div><div><strong>{data.total}</strong><span>recoverable versions</span><p>Notes · maps · mappings · lesson drafts</p></div></header><section className="history-filters" aria-label="Filter learning history"><button className={filter === "all" ? "is-active" : ""} type="button" onClick={() => choose("all")}>All <span>{Object.values(data.counts).reduce((sum, count) => sum + count, 0)}</span></button>{(Object.keys(labels) as EntityType[]).map((type) => <button className={filter === type ? "is-active" : ""} type="button" onClick={() => choose(type)} key={type}>{labels[type]} <span>{data.counts[type] ?? 0}</span></button>)}</section>{message ? <p className="history-message" role="status">{message}</p> : null}<section className="history-timeline">{data.versions.length ? data.versions.map((version) => <article key={version.id}><span className={`history-type history-type--${version.entityType}`}>{version.entityType === "note" ? "N" : version.entityType === "mind_map" ? "M" : version.entityType === "alignment_review" ? "S" : "L"}</span><div><header><small>{labels[version.entityType]} · {version.entityKey}</small><b>{version.action.replaceAll("_", " ")}</b></header><strong>{version.summary}</strong><time dateTime={version.createdAt}>{new Date(version.createdAt).toLocaleString()}</time></div><button type="button" disabled={Boolean(restoring)} onClick={() => restore(version)}>{restoring === version.id ? "Restoring…" : "Restore"}</button></article>) : <aside><strong>No versions in this view yet.</strong><p>New saves will appear here automatically. Existing records are not modified until their next save.</p><a href="/learn">Open a lesson</a></aside>}</section></div>;
}
