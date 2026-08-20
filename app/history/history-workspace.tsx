"use client";

import { useEffect, useState } from "react";

type EntityType = "note" | "mind_map" | "alignment_review" | "lesson_draft" | "source_pack" | "illness_script" | "diagnostic_drill";
type Version = { id: string; entityType: EntityType; entityKey: string; action: string; summary: string; createdAt: string; restorable: boolean };
type HistoryData = { versions: Version[]; counts: Record<EntityType, number>; total: number };
type Comparison = { left: Version; right: Version; changes: Array<{ field: string; before: string; after: string }>; confirmationKey: string };
const labels: Record<EntityType, string> = { note: "Lesson notes", mind_map: "Mind maps", alignment_review: "Source mappings", lesson_draft: "Lesson drafts", source_pack: "Source packs", illness_script: "Illness scripts", diagnostic_drill: "Diagnostic drills" };
const emptyCounts = { note: 0, mind_map: 0, alignment_review: 0, lesson_draft: 0, source_pack: 0, illness_script: 0, diagnostic_drill: 0 };

export function HistoryWorkspace() {
  const [data, setData] = useState<HistoryData>({ versions: [], counts: emptyCounts, total: 0 });
  const [filter, setFilter] = useState<"all" | EntityType>("all");
  const [message, setMessage] = useState("");
  const [restoring, setRestoring] = useState("");
  const [compareFirst, setCompareFirst] = useState<Version | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
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
  async function compare(version: Version) {
    if (!compareFirst) { setCompareFirst(version); setComparison(null); setMessage("Now choose another version of the same learning item."); return; }
    if (compareFirst.entityType !== version.entityType || compareFirst.entityKey !== version.entityKey) { setCompareFirst(version); setComparison(null); setMessage("Comparison reset. Choose another version of this same learning item."); return; }
    setMessage("Building an exact change preview…");
    try { const response = await fetch(`/api/history?left=${encodeURIComponent(compareFirst.id)}&right=${encodeURIComponent(version.id)}`); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Versions could not be compared."); setComparison(payload); setMessage(payload.changes.length ? "Change preview ready. Review it before restoring either side." : "These versions contain the same saved fields."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Versions could not be compared."); }
  }
  async function restore(version: Version) {
    if (!version.restorable) { setMessage("Clinical source-pack, illness-script, and diagnostic-drill versions remain permanent review evidence. Edit and review the live record instead of rolling an audit decision back."); return; }
    if (!comparison || ![comparison.left.id, comparison.right.id].includes(version.id)) { setMessage("Compare this version with another version of the same item first."); return; }
    if (!window.confirm(`Restore this ${labels[version.entityType].toLowerCase()} version? A safety copy of the current version will be saved first.`)) return;
    setRestoring(version.id); setMessage("Saving a safety copy and restoring the selected version…");
    try { const response = await fetch("/api/history", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ versionId: version.id, comparisonLeftId: comparison.left.id, comparisonRightId: comparison.right.id, confirmationKey: comparison.confirmationKey }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Version could not be restored."); setMessage(`${payload.label} restored. The previous state remains in history.`); setComparison(null); setCompareFirst(null); await load(filter); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Version could not be restored."); }
    finally { setRestoring(""); }
  }
  return <div className="history-page"><header className="history-hero"><div><span className="eyebrow"><i /> Recommendations 24 & 37 · Visual version comparison</span><h1>See what changed.<br />Then restore safely.</h1><p>Choose two versions of the same note, mind map, source mapping, or lesson draft. Poh-tah-toh shows every changed field before restoration and still saves a safety copy.</p></div><div><strong>{data.total}</strong><span>recoverable versions</span><p>Notes · maps · mappings · lesson drafts</p></div></header><section className="history-filters" aria-label="Filter learning history"><button className={filter === "all" ? "is-active" : ""} type="button" onClick={() => choose("all")}>All <span>{Object.values(data.counts).reduce((sum, count) => sum + count, 0)}</span></button>{(Object.keys(labels) as EntityType[]).map((type) => <button className={filter === type ? "is-active" : ""} type="button" onClick={() => choose(type)} key={type}>{labels[type]} <span>{data.counts[type] ?? 0}</span></button>)}</section>{message ? <p className="history-message" role="status">{message}</p> : null}{comparison ? <section className="version-comparison"><header><div><span className="eyebrow">Exact change preview</span><h2>{labels[comparison.left.entityType]} · {comparison.left.entityKey}</h2></div><button type="button" onClick={() => { setComparison(null); setCompareFirst(null); setMessage(""); }}>Close preview</button></header><div className="version-headings"><article><small>Earlier selection</small><strong>{new Date(comparison.left.createdAt).toLocaleString()}</strong><button type="button" disabled={Boolean(restoring)} onClick={() => restore(comparison.left)}>{restoring === comparison.left.id ? "Restoring…" : "Restore this side"}</button></article><article><small>Later selection</small><strong>{new Date(comparison.right.createdAt).toLocaleString()}</strong><button type="button" disabled={Boolean(restoring)} onClick={() => restore(comparison.right)}>{restoring === comparison.right.id ? "Restoring…" : "Restore this side"}</button></article></div><div className="version-diff">{comparison.changes.length ? comparison.changes.map((change) => <article key={change.field}><strong>{change.field.replaceAll(".", " › ")}</strong><div><p>{change.before}</p><span>→</span><p>{change.after}</p></div></article>) : <aside><strong>No saved field changed.</strong><p>The two versions are structurally identical.</p></aside>}</div></section> : null}<section className="history-timeline">{data.versions.length ? data.versions.map((version) => <article className={compareFirst?.id === version.id ? "is-comparing" : ""} key={version.id}><span className={`history-type history-type--${version.entityType}`}>{version.entityType === "note" ? "N" : version.entityType === "mind_map" ? "M" : version.entityType === "alignment_review" ? "S" : "L"}</span><div><header><small>{labels[version.entityType]} · {version.entityKey}</small><b>{version.action.replaceAll("_", " ")}</b></header><strong>{version.summary}</strong><time dateTime={version.createdAt}>{new Date(version.createdAt).toLocaleString()}</time></div><button type="button" disabled={Boolean(restoring)} onClick={() => compare(version)}>{compareFirst?.id === version.id ? "Selected" : compareFirst ? "Compare" : "Choose"}</button></article>) : <aside><strong>No versions in this view yet.</strong><p>New saves will appear here automatically. Existing records are not modified until their next save.</p><a href="/learn">Open a lesson</a></aside>}</section></div>;
}
