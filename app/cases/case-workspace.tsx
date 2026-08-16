"use client";

import { useEffect, useState } from "react";
import { clinicalCases } from "@/lib/learning-engine";

const clinicalCase = clinicalCases[0];

export function CaseWorkspace() {
  const [stepIndex, setStepIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<{ correctCount: number; totalCount: number } | null>(null);
  const [message, setMessage] = useState("");
  const step = clinicalCase.steps[stepIndex];
  const isRevealed = revealed.includes(step.id);
  useEffect(() => { let active = true; fetch("/api/cases").then((response) => response.ok ? response.json() : null).then((data) => { if (active) setAttempts(data?.attempts?.length ?? 0); }).catch(() => undefined); return () => { active = false; }; }, []);
  function checkDecision() {
    if (!Number.isInteger(decisions[step.id])) { setMessage("Choose one decision before revealing the explanation."); return; }
    setRevealed((current) => [...current, step.id]); setMessage("");
  }
  async function finishCase() {
    setMessage("Saving the reasoning trail and updating your learning graph…");
    try {
      const response = await fetch("/api/cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseId: clinicalCase.id, decisions }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Case could not be saved.");
      setResult(data); setAttempts((current) => current + 1); setMessage("Case evidence saved. Incorrect decisions were added to your mistake notebook.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Case could not be saved."); }
  }
  function restart() { setStepIndex(0); setDecisions({}); setRevealed([]); setResult(null); setMessage(""); }
  return <div className="cases-page"><header className="cases-hero"><div><span className="eyebrow"><i /> Recommendation 16 · Progressive case</span><h1>Reason through the case.<br />One reveal at a time.</h1><p>This first case applies only the two live cardiovascular foundation lessons. Disease labels, investigations, and treatment remain locked until approved sources are available.</p></div><div><span>Current case</span><strong>{clinicalCase.title}</strong><p>{clinicalCase.sourceScope}</p><small>{attempts} saved {attempts === 1 ? "attempt" : "attempts"}</small></div></header>
    <section className="case-progress" aria-label={`Case step ${stepIndex + 1} of ${clinicalCase.steps.length}`}>{clinicalCase.steps.map((item, index) => <span className={index < stepIndex ? "is-complete" : index === stepIndex ? "is-current" : ""} key={item.id}><i>{index < stepIndex ? "✓" : index + 1}</i><b>{item.stage}</b></span>)}</section>
    <section className="case-stage"><header><div><span className="eyebrow">{step.stage} · Step {stepIndex + 1} of {clinicalCase.steps.length}</span><h2>{step.prompt}</h2></div><small>{step.sourceLabel}</small></header><div className="case-options">{step.options.map((option, index) => <button className={`${decisions[step.id] === index ? "is-selected" : ""} ${isRevealed && index === step.correctOption ? "is-correct" : ""}`} type="button" disabled={isRevealed || Boolean(result)} onClick={() => setDecisions((current) => ({ ...current, [step.id]: index }))} key={option}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{isRevealed ? <aside className={decisions[step.id] === step.correctOption ? "is-correct" : "is-incorrect"}><strong>{decisions[step.id] === step.correctOption ? "Sound decision" : "Correct the mechanism"}</strong><p>{step.correction}</p><small>{step.sourceLabel}</small></aside> : null}{message ? <p className="case-message" role="status">{message}</p> : null}<footer>{result ? <><div><strong>{result.correctCount}/{result.totalCount}</strong><span>case decisions correct</span></div><a href="/learning-graph">Open updated graph →</a><button type="button" onClick={restart}>Repeat case</button></> : isRevealed ? stepIndex < clinicalCase.steps.length - 1 ? <button type="button" onClick={() => setStepIndex((current) => current + 1)}>Reveal next stage <span>→</span></button> : <button type="button" onClick={finishCase}>Finish case <span>✓</span></button> : <button type="button" onClick={checkDecision}>Lock decision <span>→</span></button>}</footer></section>
    <aside className="case-source-lock"><span>⌁</span><div><strong>Why the case stops at physiology</strong><p>The current approved scope supports pressure, valve timing, cardiac output, preload, afterload, and contractility. Clinical diagnosis and management will unlock only after matching sources and lessons are approved.</p></div><a href="/alignment">Review source map</a></aside>
  </div>;
}

