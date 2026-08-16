"use client";

import { FormEvent, useEffect, useState } from "react";
import { visualChallenges } from "@/lib/learning-engine";

type LabResult = { correctCount: number; totalCount: number; results: Array<{ questionId: string; correct: boolean; correction: string; sourceLabel: string }> };

function VisualPanel({ item }: { item: (typeof visualChallenges)[number] }) {
  const maximum = Math.max(...item.values);
  return <div className={`visual-pattern visual-pattern--${item.kind}`} aria-label={`${item.title}: ${item.labels.map((label, index) => `${label} ${item.values[index]}`).join(", ")}`}><div>{item.values.map((value, index) => <span key={item.labels[index]}><i style={{ height: `${Math.max(12, value / maximum * 100)}%` }} /><b>{value}</b><small>{item.labels[index]}</small></span>)}</div><footer>{item.kind === "pressure" ? "Compare pressure height to determine which valve gate can open." : item.kind === "output" ? "Combine rate and volume to determine flow per minute." : "Compare before and after volume patterns."}</footer></div>;
}

export function VisualLabWorkspace() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<LabResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => { let active = true; fetch("/api/visual-lab").then((response) => response.ok ? response.json() : null).then((data) => { if (active) setAttempts(data?.attempts?.length ?? 0); }).catch(() => undefined); return () => { active = false; }; }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.keys(answers).length !== visualChallenges.length) { setMessage("Interpret every panel before finishing the lab."); return; }
    setMessage("Checking the patterns and updating your evidence…");
    try {
      const response = await fetch("/api/visual-lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ labId: "cardiovascular-visual-lab-01", answers }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Visual lab could not be saved.");
      setResult(data); setAttempts((current) => current + 1); setMessage("Visual evidence saved. Any incorrect patterns are now in your mistake notebook.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Visual lab could not be saved."); }
  }
  return <div className="visual-lab-page"><header className="visual-lab-hero"><div><span className="eyebrow"><i /> Recommendation 17 · Visual laboratory</span><h1>Read the pattern<br />before reading the answer.</h1><p>Train pressure, valve, volume, and flow interpretation with lightweight source-grounded visuals. ECGs and imaging remain visibly locked until their teaching sources are approved.</p></div><div><strong>{visualChallenges.length}</strong><span>live interpretation panels</span><p>{attempts} private {attempts === 1 ? "attempt" : "attempts"} saved</p></div></header>
    <form className="visual-challenges" onSubmit={submit}>{visualChallenges.map((item, itemIndex) => { const scored = result?.results.find((row) => row.questionId === item.id); return <article key={item.id} className={scored ? scored.correct ? "is-correct" : "is-incorrect" : ""}><header><span>{String(itemIndex + 1).padStart(2, "0")}</span><div><small>{item.lessonSlug.replace("-", " ")}</small><h2>{item.title}</h2></div></header><VisualPanel item={item} /><h3>{item.prompt}</h3><div className="visual-options">{item.options.map((option, optionIndex) => <label key={option}><input type="radio" name={item.id} checked={answers[item.id] === optionIndex} disabled={Boolean(result)} onChange={() => setAnswers((current) => ({ ...current, [item.id]: optionIndex }))} /><span>{String.fromCharCode(65 + optionIndex)}</span><p>{option}</p></label>)}</div>{scored ? <aside><strong>{scored.correct ? "Pattern recognized" : "Pattern correction"}</strong><p>{scored.correction}</p><small>{scored.sourceLabel}</small></aside> : null}</article>; })}{message ? <p className="visual-message" role="status">{message}</p> : null}<footer>{result ? <><a href="/mistakes">Review visual mistakes →</a><button type="button" onClick={() => { setAnswers({}); setResult(null); setMessage(""); }}>Repeat lab</button></> : <button type="submit">Finish visual lab <span>→</span></button>}</footer></form>
    <section className="visual-locked"><article><span>ECG</span><strong>Electrical-pattern lab</strong><p>Unlock after the ECG foundation lesson and its source route are approved.</p><b>Source needed</b></article><article><span>XR</span><strong>Imaging-pattern lab</strong><p>Unlock after approved chest-imaging teaching material is attached.</p><b>Source needed</b></article></section>
  </div>;
}

