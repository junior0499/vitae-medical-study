"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { diagnosticAssessment } from "@/lib/learning-engine";

type DiagnosticResult = { correctCount: number; totalCount: number; domainScores: Record<string, number>; results: Array<{ questionId: string; correct: boolean; correction: string; sourceLabel: string }>; next: { href: string; label: string } };

export function DiagnosticWorkspace() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; fetch("/api/diagnostic").then((response) => response.ok ? response.json() : null).then((data) => { if (active) setAttempts(data?.attempts?.length ?? 0); }).catch(() => undefined); return () => { active = false; }; }, []);
  const answered = useMemo(() => Object.keys(answers).length, [answers]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (answered !== diagnosticAssessment.questions.length) { setMessage("Answer all eight questions to create a reliable starting map."); return; }
    setSaving(true); setMessage("Scoring both foundation domains…");
    try {
      const response = await fetch("/api/diagnostic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ assessmentId: diagnosticAssessment.id, answers }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Diagnostic could not be saved.");
      setResult(data); setAttempts((current) => current + 1); setMessage("Your learning graph and next-best action have been updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Diagnostic could not be saved."); }
    finally { setSaving(false); }
  }
  return <div className="diagnostic-page"><header className="diagnostic-hero"><div><span className="eyebrow"><i /> Recommendation 13 · Diagnostic gateway</span><h1>Start where your<br />knowledge actually is.</h1><p>Eight questions measure cardiac-cycle and cardiac-output foundations separately. Strong areas can move forward; weak connections return to the exact lesson.</p><a className="primary-button primary-button--dark" href="#diagnostic-questions">Begin diagnostic <span>↓</span></a></div><div><span>Diagnostic rule</span><strong>75%<small>domain readiness threshold</small></strong><p>{attempts ? `${attempts} previous ${attempts === 1 ? "attempt" : "attempts"} saved privately.` : "No previous diagnostic evidence yet."}</p></div></header>
    {result ? <section className="diagnostic-result" aria-labelledby="diagnostic-result-title"><header><div><span className="eyebrow">Your starting map</span><h2 id="diagnostic-result-title">{result.correctCount} of {result.totalCount} correct</h2></div><a href={result.next.href}>{result.next.label} →</a></header><div>{[["Cardiac cycle", result.domainScores["cardiac-cycle"]], ["Cardiac output", result.domainScores["cardiac-output"]]].map(([label, score]) => <article key={String(label)}><span>{label}</span><strong>{score}%</strong><div><i style={{ width: `${score}%` }} /></div><small>{Number(score) >= 75 ? "Ready to apply" : "Focused repair recommended"}</small></article>)}</div></section> : null}
    <section id="diagnostic-questions" className="diagnostic-questions"><header className="section-header"><div><span className="eyebrow">Source-trailed check</span><h2>{diagnosticAssessment.title}</h2></div><span>{answered} of {diagnosticAssessment.questions.length} answered</span></header><form onSubmit={submit}>{diagnosticAssessment.questions.map((question, index) => { const scored = result?.results.find((item) => item.questionId === question.id); return <fieldset key={question.id} className={scored ? scored.correct ? "is-correct" : "is-incorrect" : ""} disabled={Boolean(result)}><legend><span>{String(index + 1).padStart(2, "0")}</span><div><small>{question.domain.replace("-", " ")}</small>{question.prompt}</div></legend><div>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} /><span>{String.fromCharCode(65 + optionIndex)}</span><p>{option}</p></label>)}</div>{scored ? <aside><strong>{scored.correct ? "Connection secure" : "Repair this connection"}</strong><p>{scored.correction}</p><small>{scored.sourceLabel}</small></aside> : null}</fieldset>; })}{message ? <p className="diagnostic-message" role="status">{message}</p> : null}<footer>{result ? <><a href="/learning-graph">Open updated learning graph →</a><button type="button" onClick={() => { setResult(null); setAnswers({}); setMessage(""); }}>Retake diagnostic</button></> : <button type="submit" disabled={saving}>{saving ? "Building your map…" : "Finish and personalize"}<span>→</span></button>}</footer></form></section>
  </div>;
}

