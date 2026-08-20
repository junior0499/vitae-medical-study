"use client";

import { useEffect, useState } from "react";
import { vivaSession } from "@/lib/advanced-learning";

type VivaResult = { correctCount: number; totalCount: number; results: Array<{ questionId: string; score: number; correct: boolean; modelAnswer: string; sourceLabel: string }> };
type RecognitionResult = { results: { 0: { 0: { transcript: string } } } };
type RecognitionLike = { lang: string; interimResults: boolean; onresult: ((event: RecognitionResult) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void };
type RecognitionConstructor = new () => RecognitionLike;

export function VivaWorkspace() {
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<string[]>([]);
  const [hinted, setHinted] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<VivaResult | null>(null);
  const [message, setMessage] = useState("");
  const question = vivaSession.questions[index];
  const isRevealed = revealed.includes(question.id);
  useEffect(() => {
    let active = true;
    fetch("/api/viva").then((response) => response.ok ? response.json() : null).then((data) => { if (active) setAttempts(data?.attempts?.length ?? 0); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  function listen() {
    const speechWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) { setMessage("Speech input is unavailable in this browser. You can type the answer instead."); return; }
    const recognition = new Constructor();
    recognition.lang = "en-US"; recognition.interimResults = false; setListening(true); setMessage("Listening… speak your complete answer.");
    recognition.onresult = (event) => { setResponses((current) => ({ ...current, [question.id]: event.results[0][0].transcript })); setMessage("Answer captured. Edit it if needed, then lock your response."); };
    recognition.onerror = () => setMessage("Speech was not captured. Try again or type your answer.");
    recognition.onend = () => setListening(false);
    recognition.start();
  }
  function reveal() {
    if (!responses[question.id]?.trim()) { setMessage("Speak or type an answer before revealing the correction."); return; }
    setRevealed((current) => [...current, question.id]); setMessage("");
  }
  async function finish() {
    setMessage("Scoring the complete viva and saving your evidence…");
    try {
      const response = await fetch("/api/viva", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: vivaSession.id, responses }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Viva could not be saved.");
      setResult(data); setAttempts((current) => current + 1); setMessage("Viva saved. Missing concepts were added to your correction loop.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Viva could not be saved."); }
  }
  function restart() { setIndex(0); setResponses({}); setRevealed([]); setHinted([]); setResult(null); setMessage(""); }
  const scored = result?.results.find((item) => item.questionId === question.id);
  return <div className="viva-page"><header className="viva-hero"><div><span className="eyebrow"><i /> Recommendation 18 · Oral viva</span><h1>Say the mechanism<br />in your own words.</h1><p>Answer one question at a time. Use speech when your browser supports it, ask for a hint if needed, and compare your wording with a source-grounded viva response.</p><a href="/voice-teach-back">Need deeper link-by-link feedback? Open Voice teach-back →</a></div><div><strong>{attempts}</strong><span>saved viva attempts</span><p>Speech input when supported · typing always available</p></div></header><section className="viva-progress" aria-label={`Viva question ${index + 1} of ${vivaSession.questions.length}`}>{vivaSession.questions.map((item, itemIndex) => <span className={itemIndex < index ? "is-complete" : itemIndex === index ? "is-current" : ""} key={item.id}><i>{itemIndex < index ? "✓" : itemIndex + 1}</i><b>{item.lessonSlug.replace("-", " ")}</b></span>)}</section><section className="viva-stage"><header><div><span className="eyebrow">Question {index + 1} of {vivaSession.questions.length}</span><h2>{question.prompt}</h2></div><small>{question.sourceLabel}</small></header><div className="viva-answer"><label htmlFor="viva-response">Your answer</label><textarea id="viva-response" value={responses[question.id] ?? ""} disabled={isRevealed || Boolean(result)} onChange={(event) => setResponses((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Explain the mechanism as if an examiner is listening…" /><div><button className="viva-mic" type="button" disabled={listening || isRevealed || Boolean(result)} onClick={listen}>{listening ? "● Listening" : "◉ Speak answer"}</button><button type="button" disabled={isRevealed || Boolean(result)} onClick={() => setHinted((current) => [...current, question.id])}>Need a hint</button></div>{hinted.includes(question.id) ? <p className="viva-hint"><strong>Hint:</strong> {question.hint}</p> : null}</div>{isRevealed ? <aside><span>Corrected viva response</span><p>{question.modelAnswer}</p><small>{question.sourceLabel}</small>{scored ? <b>{scored.score}% concept coverage</b> : null}</aside> : null}{message ? <p className="viva-message" role="status">{message}</p> : null}<footer>{result ? <><div><strong>{result.correctCount}/{result.totalCount}</strong><span>responses reached the concept threshold</span></div><a href="/voice-teach-back">Open focused teach-back →</a><button type="button" onClick={restart}>Repeat viva</button></> : isRevealed ? index < vivaSession.questions.length - 1 ? <button type="button" onClick={() => setIndex((current) => current + 1)}>Next viva question <span>→</span></button> : <button type="button" onClick={finish}>Finish and save <span>✓</span></button> : <button type="button" onClick={reveal}>Lock and compare <span>→</span></button>}</footer></section></div>;
}
