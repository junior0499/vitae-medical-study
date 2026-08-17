"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Pattern = { conceptKey: string; label: string; lessonSlug: string; level: "repeated" | "watch"; signalCount: number; incorrectOccurrences: number; lapses: number; distinctQuestions: number; openMistakes: number; riskScore: number; correctionAnchors: string[]; originalAnswers: string[]; sourceLabels: string[]; latestPrompt: string; repair: { status: string; reflection: string; completedAt: string } | null; microLesson: { notice: string; correctAnchor: string; contrast: string; retrievalPrompt: string } };
type Summary = { repeated: number; watched: number; completedRepairs: number };

export function MisconceptionWorkspace() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [summary, setSummary] = useState<Summary>({ repeated: 0, watched: 0, completedRepairs: 0 });
  const [method, setMethod] = useState("Reading your correction evidence…");
  const [filter, setFilter] = useState<"repeated" | "watch" | "all">("repeated");
  const [reflections, setReflections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/misconceptions"); const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Patterns could not be loaded.");
    setPatterns(data.patterns ?? []); setSummary(data.summary); setMethod(data.method);
    setReflections(Object.fromEntries((data.patterns ?? []).map((pattern: Pattern) => [pattern.conceptKey, pattern.repair?.reflection ?? ""])));
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/misconceptions").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Patterns could not be loaded."); return data; }).then((data) => {
      if (!active) return;
      setPatterns(data.patterns ?? []); setSummary(data.summary); setMethod(data.method);
      setReflections(Object.fromEntries((data.patterns ?? []).map((pattern: Pattern) => [pattern.conceptKey, pattern.repair?.reflection ?? ""])));
    }).catch((error) => { if (active) setMethod(error instanceof Error ? error.message : "Patterns could not be loaded."); });
    return () => { active = false; };
  }, []);
  const visible = useMemo(() => patterns.filter((pattern) => filter === "all" || pattern.level === filter), [filter, patterns]);

  async function complete(pattern: Pattern) {
    setSaving(pattern.conceptKey); setMessage("Saving your corrective explanation…");
    try {
      const response = await fetch("/api/misconceptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conceptKey: pattern.conceptKey, reflection: reflections[pattern.conceptKey] ?? "" }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "The repair could not be saved.");
      await load(); setMessage("Corrective lesson completed. The pattern remains visible so future errors can be compared honestly.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The repair could not be saved."); }
    finally { setSaving(""); }
  }

  return <div className="misconception-page">
    <header className="misconception-hero"><div><span className="eyebrow"><i /> Error pattern · correction · retrieval</span><h1>Find the confusion<br />behind the mistake.</h1><p>Repeated wrong answers and recall lapses are grouped into concept-level patterns. Each pattern produces a short correction anchored to the explanations already saved in your mistake notebook.</p></div><div><span><strong>{summary.repeated}</strong><small>repeated</small></span><span><strong>{summary.watched}</strong><small>watched</small></span><span><strong>{summary.completedRepairs}</strong><small>repaired</small></span></div></header>
    <section className="misconception-toolbar"><p>{method}</p><div>{(["repeated", "watch", "all"] as const).map((item) => <button className={filter === item ? "is-active" : ""} type="button" onClick={() => setFilter(item)} key={item}>{item}</button>)}</div></section>
    {visible.length ? <section className="misconception-list">{visible.map((pattern) => <article key={pattern.conceptKey}><header><div><span className={`misconception-level is-${pattern.level}`}>{pattern.level === "repeated" ? "Repeated pattern" : "Watch signal"}</span><h2>{pattern.label}</h2><p>{pattern.signalCount} signals · {pattern.incorrectOccurrences} incorrect attempts · {pattern.lapses} recall lapses</p></div><strong>{pattern.riskScore}<small>pattern score</small></strong></header><div className="micro-lesson"><section><span>01 · Notice</span><p>{pattern.microLesson.notice}</p></section><section><span>02 · Correct anchor</span><p>{pattern.microLesson.correctAnchor}</p>{pattern.sourceLabels.map((source) => <small key={source}>{source}</small>)}</section><section><span>03 · Contrast</span><p>{pattern.microLesson.contrast}</p>{pattern.originalAnswers.length > 1 ? <small>Also seen: {pattern.originalAnswers.slice(1).join(" · ")}</small> : null}</section><section><span>04 · Retrieve</span><p>{pattern.microLesson.retrievalPrompt}</p><textarea value={reflections[pattern.conceptKey] ?? ""} onChange={(event) => setReflections((current) => ({ ...current, [pattern.conceptKey]: event.target.value }))} placeholder="Explain the correction and name the distinction you will use next time…" /><button type="button" onClick={() => complete(pattern)} disabled={saving === pattern.conceptKey}>{saving === pattern.conceptKey ? "Saving…" : pattern.repair ? "Update corrective explanation" : "Complete micro-lesson"}</button>{pattern.repair ? <small>Last completed {new Date(pattern.repair.completedAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</small> : null}</section></div></article>)}</section> : <section className="misconception-empty"><span>34</span><h2>{patterns.length ? "No patterns match this filter." : "No misconception pattern yet."}</h2><p>{patterns.length ? "Try the watch or all view." : "Incorrect assessments, clinical decisions, viva responses, and recall lapses will appear here when enough evidence exists."}</p><a href="/assessment">Take a source-trailed assessment →</a></section>}
    {message ? <p className="misconception-status" role="status">{message}</p> : null}
  </div>;
}
