"use client";

import { useEffect, useState } from "react";
import { interleavedSession } from "@/lib/advanced-learning";

type Confidence = "low" | "medium" | "high";
type ReviewResult = { correctCount: number; totalCount: number; highConfidenceWrong: number; results: Array<{ questionId: string; correct: boolean; correction: string; sourceLabel: string }> };

export function InterleavedWorkspace() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confidence, setConfidence] = useState<Record<string, Confidence>>({});
  const [revealed, setRevealed] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [message, setMessage] = useState("");
  const question = interleavedSession.questions[index];
  const isRevealed = revealed.includes(question.id);
  useEffect(() => { let active = true; fetch("/api/interleaved").then((response) => response.ok ? response.json() : null).then((data) => { if (active) setAttempts(data?.attempts?.length ?? 0); }).catch(() => undefined); return () => { active = false; }; }, []);
  function check() {
    if (!Number.isInteger(answers[question.id]) || !confidence[question.id]) { setMessage("Choose an answer and record how confident you are."); return; }
    setRevealed((current) => [...current, question.id]); setMessage("");
  }
  async function finish() {
    setMessage("Saving the mixed review and calibrating confidence…");
    try {
      const response = await fetch("/api/interleaved", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: interleavedSession.id, answers, confidence }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Review could not be saved.");
      setResult(data); setAttempts((current) => current + 1); setMessage("Review saved. Confidence risks and corrections are now connected.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Review could not be saved."); }
  }
  function restart() { setIndex(0); setAnswers({}); setConfidence({}); setRevealed([]); setResult(null); setMessage(""); }
  const localCorrect = answers[question.id] === question.correctOption;
  return <div className="interleaved-page"><header className="interleaved-hero"><div><span className="eyebrow"><i /> Recommendation 20 · Interleaved review</span><h1>Switch the mechanism<br />before memory settles.</h1><p>Cardiac-cycle and cardiac-output questions alternate. Each answer includes a confidence judgement, so recall strength and certainty are measured separately.</p></div><div><strong>{attempts}</strong><span>mixed sessions saved</span><p>8 questions · 2 domains · confidence required</p></div></header><section className="interleave-ribbon" aria-label={`Question ${index + 1} of ${interleavedSession.questions.length}`}>{interleavedSession.questions.map((item, itemIndex) => <span className={`${itemIndex === index ? "is-current" : ""} ${itemIndex < index ? "is-complete" : ""}`} key={item.id}><i>{itemIndex < index ? "✓" : itemIndex + 1}</i><small>{item.domain}</small></span>)}</section><section className="interleave-stage"><header><div><span className="eyebrow">{question.domain} · Question {index + 1}</span><h2>{question.prompt}</h2></div><small>{question.sourceLabel}</small></header><div className="interleave-options">{question.options.map((option, optionIndex) => <button className={`${answers[question.id] === optionIndex ? "is-selected" : ""} ${isRevealed && optionIndex === question.correctOption ? "is-correct" : ""}`} type="button" disabled={isRevealed || Boolean(result)} onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} key={option}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div><div className="confidence-choice"><span>Before checking: how sure are you?</span>{(["low", "medium", "high"] as const).map((level) => <button className={confidence[question.id] === level ? "is-active" : ""} type="button" disabled={isRevealed || Boolean(result)} aria-pressed={confidence[question.id] === level} onClick={() => setConfidence((current) => ({ ...current, [question.id]: level }))} key={level}>{level}</button>)}</div>{isRevealed ? <aside className={localCorrect ? "is-correct" : "is-incorrect"}><strong>{localCorrect ? confidence[question.id] === "low" ? "Correct — confidence may be too low" : "Correct connection" : confidence[question.id] === "high" ? "Confidence risk detected" : "Correct this connection"}</strong><p>{question.correction}</p><small>{question.sourceLabel}</small></aside> : null}{message ? <p className="interleave-message" role="status">{message}</p> : null}<footer>{result ? <><div><strong>{result.correctCount}/{result.totalCount}</strong><span>{result.highConfidenceWrong} confident-but-incorrect</span></div><a href="/confidence">Open calibration →</a><button type="button" onClick={restart}>Repeat mix</button></> : isRevealed ? index < interleavedSession.questions.length - 1 ? <button type="button" onClick={() => setIndex((current) => current + 1)}>Switch topic <span>→</span></button> : <button type="button" onClick={finish}>Finish and calibrate <span>✓</span></button> : <button type="button" onClick={check}>Check answer <span>→</span></button>}</footer></section></div>;
}
