"use client";

import { useEffect, useState } from "react";
import { voicePrompts } from "@/lib/voice-teach-back";

type Confidence = "low" | "medium" | "high";
type VoiceResult = { score: number; correct: boolean; matched: string[]; missing: string[]; modelAnswer: string; sourceLabel: string; sourceState: string; nextReviewAt: string | null; scheduledCorrections: number };
type RecognitionResult = { results: { 0: { 0: { transcript: string } } } };
type RecognitionLike = { lang: string; interimResults: boolean; onresult: ((event: RecognitionResult) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void };
type RecognitionConstructor = new () => RecognitionLike;

export function VoiceTeachBackWorkspace() {
  const [promptId, setPromptId] = useState(voicePrompts[0].id);
  const [response, setResponse] = useState("");
  const [confidence, setConfidence] = useState<Confidence>("medium");
  const [inputMode, setInputMode] = useState<"voice" | "typed">("typed");
  const [listening, setListening] = useState(false);
  const [hinted, setHinted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [dueCorrections, setDueCorrections] = useState(0);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [message, setMessage] = useState("");
  const prompt = voicePrompts.find((item) => item.id === promptId) ?? voicePrompts[0];

  useEffect(() => {
    let active = true;
    fetch("/api/voice-teach-back").then((request) => request.ok ? request.json() : null).then((data) => { if (!active || !data) return; setAttempts(data.attempts?.length ?? 0); setDueCorrections(data.dueCorrections ?? 0); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function selectPrompt(id: string) {
    setPromptId(id); setResponse(""); setResult(null); setHinted(false); setMessage(""); setInputMode("typed");
  }

  function listen() {
    const speechWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) { setMessage("Speech input is unavailable in this browser. Type your explanation instead."); return; }
    const recognition = new Constructor();
    recognition.lang = "en-US"; recognition.interimResults = false; setListening(true); setInputMode("voice"); setMessage("Listening… explain the complete chain.");
    recognition.onresult = (event) => { setResponse(event.results[0][0].transcript); setMessage("Speech captured. Check the transcript before submitting."); };
    recognition.onerror = () => setMessage("Speech was not captured. Try again or type your explanation.");
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function submit() {
    if (response.trim().length < 10) { setMessage("Give a fuller explanation before checking the reasoning links."); return; }
    setMessage("Checking the reasoning chain and preparing any focused correction…");
    try {
      const request = await fetch("/api/voice-teach-back", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ promptId: prompt.id, response, confidence, inputMode }) });
      const data = await request.json();
      if (!request.ok) throw new Error(data.error ?? "Teach-back could not be saved.");
      setResult(data); setAttempts((value) => value + 1); setMessage(data.scheduledCorrections ? `${data.scheduledCorrections} missing reasoning ${data.scheduledCorrections === 1 ? "link was" : "links were"} scheduled for focused recall.` : "Complete reasoning chain saved. No correction card was needed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Teach-back could not be saved.");
    }
  }

  return <div className="voice-page">
    <header className="voice-hero"><div><span className="eyebrow"><i /> Recommendation 49 · Voice viva and teach-back</span><h1>Teach it back.<br />Find the missing link.</h1><p>Explain one mechanism or viva case aloud. Poh-tah-toh checks the expected reasoning steps, shows the gaps, and schedules only the links that need another retrieval.</p><a className="primary-button primary-button--dark" href="#voice-stage">Start a teach-back <span>→</span></a></div><div><span><strong>{attempts}</strong><small>saved attempts</small></span><span><strong>{dueCorrections}</strong><small>due corrections</small></span><p>Speech when available · typing always works</p></div></header>
    <aside className="voice-safety"><span>i</span><div><strong>Concept matching supports reflection; it is not an examiner.</strong><p>Equivalent wording, speaking quality, and clinical judgement may need human review. Clinical claims remain limited to the visible source state.</p></div><a href="/evidence-governance">Check source rules</a></aside>
    <section className="voice-prompt-picker" aria-labelledby="voice-prompts-title"><header className="section-header"><div><span className="eyebrow">Choose the challenge</span><h2 id="voice-prompts-title">Mechanism, calculation, or safety gate</h2></div><span>One complete answer at a time</span></header><div>{voicePrompts.map((item, index) => <button type="button" className={item.id === prompt.id ? "is-active" : ""} onClick={() => selectPrompt(item.id)} key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><small>{item.kind.replace("_", " ")}</small><strong>{item.title}</strong><b>{item.sourceState}</b></button>)}</div></section>
    <section id="voice-stage" className="voice-stage"><header><div><span className="eyebrow">{prompt.kind.replace("_", " ")} · {prompt.lessonSlug.replace("-", " ")}</span><h2>{prompt.prompt}</h2><p>{prompt.scenario}</p></div><small className={`voice-source voice-source--${prompt.sourceState}`}>{prompt.sourceState} · {prompt.sourceLabel}</small></header><label><span>Your explanation</span><textarea value={response} disabled={Boolean(result)} onChange={(event) => { setResponse(event.target.value); setInputMode("typed"); }} placeholder="Explain each causal step as if a viva examiner is listening…" maxLength={4000} /></label><div className="voice-actions"><button type="button" disabled={listening || Boolean(result)} onClick={listen}>{listening ? "● Listening" : "◉ Speak answer"}</button><button type="button" disabled={Boolean(result)} onClick={() => setHinted(true)}>Need a hint</button><span>{response.trim().split(/\s+/).filter(Boolean).length} words</span></div>{hinted ? <p className="voice-hint"><strong>Hint:</strong> {prompt.hint}</p> : null}<fieldset disabled={Boolean(result)}><legend>How confident are you?</legend>{(["low", "medium", "high"] as Confidence[]).map((value) => <button type="button" className={confidence === value ? "is-active" : ""} onClick={() => setConfidence(value)} key={value}>{value}</button>)}</fieldset>{!result ? <button className="voice-submit" type="button" onClick={submit}>Check reasoning steps <span>→</span></button> : null}
      {result ? <section className="voice-feedback"><header><div><span>Reasoning coverage</span><strong>{result.score}%</strong></div><b className={result.correct ? "is-complete" : "is-building"}>{result.correct ? "threshold reached" : "correction scheduled"}</b></header><div>{prompt.conceptGroups.map((group) => { const matched = result.matched.includes(group.label); return <article className={matched ? "is-matched" : "is-missing"} key={group.label}><span>{matched ? "✓" : "→"}</span><div><small>{matched ? "Reasoning link found" : "Reasoning link to repair"}</small><strong>{group.label}</strong></div></article>; })}</div><aside><span>Source-grounded model answer</span><p>{result.modelAnswer}</p><small>{result.sourceLabel}</small></aside><footer><button type="button" onClick={() => { setResponse(""); setResult(null); setHinted(false); setMessage(""); }}>Try again</button><a href="/review">Open focused review →</a><a href="/outcomes">View learning outcomes →</a></footer></section> : null}
      {message ? <p className="voice-message" role="status">{message}</p> : null}
    </section>
  </div>;
}
