"use client";

import { useEffect, useState } from "react";
import { clinicalEncounter } from "@/lib/clinical-encounter";

const stateLabels = { supported: "Lesson supported", scaffold: "Reasoning scaffold", locked: "Source locked" } as const;

export function ClinicalEncounterWorkspace() {
  const [stage, setStage] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<{ correctCount: number; totalCount: number } | null>(null);
  const [message, setMessage] = useState("");
  const step = clinicalEncounter.steps[stage];
  const checked = revealed.includes(step.id);
  useEffect(() => { let active = true; fetch("/api/clinical-encounter").then((response) => response.ok ? response.json() : null).then((data) => { if (active) setAttempts(data?.attempts?.length ?? 0); }).catch(() => undefined); return () => { active = false; }; }, []);
  function check() { if (!Number.isInteger(decisions[step.id])) { setMessage("Choose one action before seeing the rubric."); return; } setRevealed((current) => [...current, step.id]); setMessage(""); }
  async function finish() {
    setMessage("Saving the encounter trail…");
    try {
      const response = await fetch("/api/clinical-encounter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ encounterId: clinicalEncounter.id, decisions }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Encounter could not be saved.");
      setResult(data); setAttempts((current) => current + 1); setMessage("Encounter proof saved. Any incorrect stage is now in your mistake notebook.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Encounter could not be saved."); }
  }
  function restart() { setStage(0); setDecisions({}); setRevealed([]); setResult(null); setMessage(""); }
  return <div className="encounter-page"><header className="encounter-hero"><div><span className="eyebrow"><i /> Recommendation 45 · Clinical encounter simulator</span><h1>Meet the patient.<br />Respect the evidence boundary.</h1><p>Move through history, examination, investigations, differential reasoning, management, and communication. The encounter branches through your choices and stops wherever the approved source stops.</p><a className="primary-button primary-button--dark" href="/mastery-proof">See strict mastery proof <span>→</span></a></div><div><span>Current encounter</span><strong>{clinicalEncounter.title}</strong><p>{clinicalEncounter.subtitle}</p><small>{attempts} saved {attempts === 1 ? "attempt" : "attempts"}</small></div></header>
    <nav className="encounter-timeline" aria-label={`Encounter stage ${stage + 1} of ${clinicalEncounter.steps.length}`}>{clinicalEncounter.steps.map((item, index) => <span className={index < stage ? "is-complete" : index === stage ? "is-current" : ""} key={item.id}><i>{index < stage ? "✓" : index + 1}</i><b>{item.stage}</b></span>)}</nav>
    <section className="encounter-stage"><header><div><span className="eyebrow">{step.stage} · {stage + 1} of {clinicalEncounter.steps.length}</span><h2>{step.scene}</h2></div><b className={`source-state source-state--${step.sourceState}`}>{stateLabels[step.sourceState]}</b></header><h3>{step.prompt}</h3><div className="encounter-options">{step.options.map((option, index) => <button className={`${decisions[step.id] === index ? "is-selected" : ""} ${checked && index === step.correctOption ? "is-correct" : ""}`} type="button" disabled={checked || Boolean(result)} onClick={() => setDecisions((current) => ({ ...current, [step.id]: index }))} key={option}><span>{String.fromCharCode(65 + index)}</span><b>{option}</b></button>)}</div>{checked ? <aside className={decisions[step.id] === step.correctOption ? "is-correct" : "is-incorrect"}><strong>{decisions[step.id] === step.correctOption ? "Safe reasoning" : "Repair this stage"}</strong><p>{step.correction}</p><small>{step.sourceLabel}</small></aside> : null}{message ? <p className="encounter-message" role="status">{message}</p> : null}<footer>{result ? <><div><strong>{result.correctCount}/{result.totalCount}</strong><span>stages correct</span></div><a href="/mistakes">Open corrections →</a><button type="button" onClick={restart}>Repeat encounter</button></> : checked ? stage < clinicalEncounter.steps.length - 1 ? <button type="button" onClick={() => setStage((current) => current + 1)}>Continue to {clinicalEncounter.steps[stage + 1].stage} <span>→</span></button> : <button type="button" onClick={finish}>Finish encounter <span>✓</span></button> : <button type="button" onClick={check}>Lock this action <span>→</span></button>}</footer></section>
    <aside className="encounter-lock"><span>⌁</span><div><strong>The stop is part of the score.</strong><p>Choosing not to invent a diagnosis or treatment is a correct clinical-safety decision. Unlock those stages only after the matching source is uploaded, mapped, and reviewed.</p></div><a href="/evidence-governance">Review evidence freshness</a></aside></div>;
}

