"use client";

import { useEffect, useState } from "react";

type Retention = { days: number; label: string; eligible: number; correct: number; rate: number | null };
type Outcomes = {
  retention: Retention[];
  unfamiliarCases: { activities: number; answered: number; correct: number; rate: number | null; method: string };
  confidence: { judgements: number; calibrated: number; rate: number | null; highConfidenceWrong: number; lowConfidenceCorrect: number; method: string };
  prerequisites: Array<{ slug: string; title: string; href: string; state: string; passedCount: number; openMistakes: number; missing: string[] }>;
  dataMaturity: { state: string; totalObservations: number; firstEvidenceAt: string | null; lastEvidenceAt: string | null; detail: string };
  boundary: string;
};

function metric(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function formatDate(value: string | null) {
  if (!value) return "No evidence yet";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function OutcomesWorkspace() {
  const [outcomes, setOutcomes] = useState<Outcomes | null>(null);
  const [message, setMessage] = useState("Calculating your private learning outcomes…");
  useEffect(() => {
    let active = true;
    fetch("/api/outcomes").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Outcomes could not be loaded."); return data; }).then((data) => { if (!active) return; setOutcomes(data); setMessage(""); }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Outcomes could not be loaded."); });
    return () => { active = false; };
  }, []);
  const retention = outcomes?.retention ?? [7, 30, 90].map((days) => ({ days, label: `${days}-day retention`, eligible: 0, correct: 0, rate: null }));
  return <div className="outcomes-page">
    <header className="outcomes-hero"><div><span className="eyebrow"><i /> Recommendation 50 · Real learning outcomes</span><h1>Measure what still<br />works later.</h1><p>Study time and streaks cannot prove learning. This dashboard looks for delayed retrieval, first-attempt transfer, confidence accuracy, and the prerequisite gate that still needs work.</p><a className="primary-button primary-button--dark" href="/voice-teach-back">Create explanation evidence <span>→</span></a></div><div><strong>{outcomes?.dataMaturity.totalObservations ?? 0}</strong><span>scored observations</span><p>{outcomes?.dataMaturity.state ?? "early personal signal"}</p></div></header>
    <aside className="outcomes-boundary"><span>i</span><div><strong>Every number shows its evidence.</strong><p>{outcomes?.boundary ?? "These are private personal learning signals, not cohort statistics, exam prediction, or certification of clinical competence."}</p></div><a href="/mastery-proof">Inspect mastery rules</a></aside>
    <section className="retention-panel"><header className="section-header"><div><span className="eyebrow">Delayed retrieval</span><h2>7-, 30-, and 90-day retention</h2></div><span>Repeated evidence only</span></header><div>{retention.map((item) => <article key={item.days}><span>{item.days}</span><small>days later</small><strong>{metric(item.rate)}</strong><p>{item.eligible ? `${item.correct} of ${item.eligible} repeated items correct` : "No delayed evidence yet"}</p></article>)}</div><p>A question becomes eligible only when the same item is answered again after the full interval. New activity does not masquerade as retention.</p></section>
    <section className="outcome-signal-grid"><article><header><span>Transfer</span><h2>Unfamiliar-case performance</h2></header><strong>{metric(outcomes?.unfamiliarCases.rate ?? null)}</strong><p>{outcomes?.unfamiliarCases.answered ? `${outcomes.unfamiliarCases.correct} of ${outcomes.unfamiliarCases.answered} decisions correct across ${outcomes.unfamiliarCases.activities} first attempts.` : "Complete a new case, encounter, or visual challenge to create first-attempt transfer evidence."}</p><small>{outcomes?.unfamiliarCases.method ?? "Only first attempts count."}</small><a href="/clinical-encounter">Start an encounter →</a></article><article><header><span>Calibration</span><h2>Confidence accuracy</h2></header><strong>{metric(outcomes?.confidence.rate ?? null)}</strong><p>{outcomes?.confidence.judgements ? `${outcomes.confidence.calibrated} of ${outcomes.confidence.judgements} confidence judgements aligned · ${outcomes.confidence.highConfidenceWrong} confident errors.` : "Record confidence with a mixed review or teach-back to begin calibration."}</p><small>{outcomes?.confidence.method ?? "Confidence is compared with correctness."}</small><a href="/confidence">Open calibration →</a></article></section>
    <section className="prerequisite-panel"><header className="section-header"><div><span className="eyebrow">Weak prerequisites</span><h2>Repair the gate, not the streak</h2></div><a href="/mastery-proof">Open strict proof →</a></header><div>{outcomes?.prerequisites.map((topic) => <article key={topic.slug}><header><div><span>{topic.passedCount}/4 proof gates</span><h3>{topic.title}</h3></div><b className={`proof-state proof-state--${topic.state}`}>{topic.state}</b></header><p>{topic.missing.length ? `Still needs: ${topic.missing.join(", ")}.` : "All four evidence gates are present."}</p>{topic.openMistakes ? <small>{topic.openMistakes} open correction{topic.openMistakes === 1 ? "" : "s"} still blocks mastery.</small> : <small>No open correction currently blocks this topic.</small>}<a href={topic.href}>Open foundation →</a></article>)}{!outcomes?.prerequisites.length ? <p className="outcomes-empty">Your prerequisite evidence will appear here.</p> : null}</div></section>
    <section className="outcomes-maturity"><span>⌁</span><div><strong>{outcomes?.dataMaturity.state ?? "Early personal signal"}</strong><p>{outcomes?.dataMaturity.detail ?? "Keep collecting repeated retrieval and first-attempt application evidence before treating trends as stable."}</p></div><dl><div><dt>First evidence</dt><dd>{formatDate(outcomes?.dataMaturity.firstEvidenceAt ?? null)}</dd></div><div><dt>Latest evidence</dt><dd>{formatDate(outcomes?.dataMaturity.lastEvidenceAt ?? null)}</dd></div></dl></section>
    {message ? <p className="outcomes-message" role="status">{message}</p> : null}
  </div>;
}
