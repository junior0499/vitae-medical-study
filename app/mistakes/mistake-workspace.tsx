"use client";

import { useEffect, useMemo, useState } from "react";

type Mistake = {
  id: string; subject: string; lessonSlug: string; prompt: string; originalAnswer: string;
  correctedConcept: string; reason: string; sourceLabel: string; status: "open" | "resolved";
  nextReviewAt: string; updatedAt: string;
};
type Summary = { open: number; resolved: number; due: number };

export function MistakeWorkspace() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [summary, setSummary] = useState<Summary>({ open: 0, resolved: 0, due: 0 });
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/mistakes").then((response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !data) return;
      setMistakes(data.mistakes ?? []); setSummary(data.summary ?? { open: 0, resolved: 0, due: 0 });
      setReasons(Object.fromEntries((data.mistakes ?? []).map((item: Mistake) => [item.id, item.reason])));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => mistakes.filter((mistake) => filter === "all" || mistake.status === filter), [filter, mistakes]);

  async function updateMistake(mistake: Mistake, status: "open" | "resolved") {
    setSaving(mistake.id);
    try {
      const response = await fetch("/api/mistakes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: mistake.id, status, reason: reasons[mistake.id] ?? "" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Update failed.");
      setMistakes((current) => current.map((item) => item.id === mistake.id ? data.mistake : item));
      setSummary((current) => ({ ...current, open: mistakes.filter((item) => (item.id === mistake.id ? status : item.status) === "open").length, resolved: mistakes.filter((item) => (item.id === mistake.id ? status : item.status) === "resolved").length }));
    } finally { setSaving(""); }
  }

  return <div className="mistakes-page">
    <header className="mistakes-hero"><div><span className="eyebrow"><i /> Personal correction system</span><h1>Keep the mistake.<br />Lose the confusion.</h1><p>Every incorrect assessment answer keeps your original choice, the corrected concept, its learning source, and the next review date.</p><a className="primary-button primary-button--dark" href="/misconceptions">Detect repeated misconceptions <span>→</span></a></div><div><span><strong>{summary.open}</strong><small>open</small></span><span><strong>{summary.due}</strong><small>due</small></span><span><strong>{summary.resolved}</strong><small>resolved</small></span></div></header>
    <section className="mistake-list" aria-labelledby="mistake-list-title"><header className="section-header"><div><span className="eyebrow">Correction log</span><h2 id="mistake-list-title">Your mistake notebook</h2></div><div className="mistake-filters">{(["open", "resolved", "all"] as const).map((item) => <button className={filter === item ? "is-active" : ""} type="button" onClick={() => setFilter(item)} key={item}>{item}</button>)}</div></header>
      {visible.length ? <div>{visible.map((mistake) => <article className={mistake.status === "resolved" ? "is-resolved" : ""} key={mistake.id}><header><span>{mistake.subject}</span><b>{mistake.status}</b></header><h3>{mistake.prompt}</h3><div className="mistake-correction"><p><span>Your answer</span>{mistake.originalAnswer}</p><p><span>Corrected concept</span>{mistake.correctedConcept}</p></div><small>{mistake.sourceLabel} · Review {new Date(mistake.nextReviewAt).toLocaleDateString("en", { day: "numeric", month: "short" })}</small><label><span>Why did I miss this?</span><textarea value={reasons[mistake.id] ?? ""} onChange={(event) => setReasons((current) => ({ ...current, [mistake.id]: event.target.value }))} placeholder="Example: I mixed up atrial and ventricular pressure." maxLength={1000} /></label><footer><a href={`/learn/cardiovascular/${mistake.lessonSlug}`}>Open lesson →</a><button type="button" disabled={saving === mistake.id} onClick={() => updateMistake(mistake, mistake.status === "open" ? "resolved" : "open")}>{saving === mistake.id ? "Saving…" : mistake.status === "open" ? "Mark understood ✓" : "Reopen"}</button></footer></article>)}</div> : <div className="mistake-empty"><span>✓</span><h3>{filter === "open" ? "No open mistakes." : "Nothing here yet."}</h3><p>Incorrect assessment answers will appear here automatically.</p><a href="/assessment">Open Assessment Centre</a></div>}
    </section>
  </div>;
}
