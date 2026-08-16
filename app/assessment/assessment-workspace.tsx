"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { cardiovascularAssessment, clinicalPracticeCards } from "@/lib/assessment-bank";

type Attempt = { id: string; correctCount: number; totalCount: number; completedAt: string };
type AssessmentResult = { correctCount: number; totalCount: number; results: Array<{ questionId: string; correct: boolean; correctOption: number; correction: string; sourceLabel: string }> };

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function AssessmentWorkspace() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState(cardiovascularAssessment.timeMinutes * 60);

  useEffect(() => {
    let active = true;
    fetch("/api/assessments").then((response) => response.ok ? response.json() : null).then((data) => {
      if (active && data?.attempts) setAttempts(data.attempts);
    }).catch(() => undefined);
    const timer = window.setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const bestScore = useMemo(() => attempts.length ? Math.max(...attempts.map((attempt) => Math.round(attempt.correctCount / attempt.totalCount * 100))) : 0, [attempts]);

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.keys(answers).length !== cardiovascularAssessment.questions.length) {
      setMessage("Answer every question before submitting the timed check."); return;
    }
    setSubmitting(true); setMessage("Checking answers and updating your mistake notebook…");
    try {
      const response = await fetch("/api/assessments", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessmentId: cardiovascularAssessment.id, answers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Assessment could not be saved.");
      setResult(data);
      setMessage(`${data.correctCount} of ${data.totalCount} correct. Incorrect concepts were added to your notebook.`);
      setAttempts((current) => [{ id: data.attemptId, correctCount: data.correctCount, totalCount: data.totalCount, completedAt: new Date().toISOString() }, ...current]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assessment could not be saved.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="assessment-page">
      <header className="assessment-hero">
        <div><span className="eyebrow"><i /> Clinical Assessment Centre</span><h1>Test the connection,<br />not just the definition.</h1><p>Practise only from live or approved learning material. Wrong answers move directly into your mistake notebook with the correction and source trail.</p><div><a className="primary-button primary-button--dark" href="#timed-check">Start timed check <span>↓</span></a><a href="/mistakes">Open mistake notebook →</a></div></div>
        <div className="assessment-overview"><span>Current evidence</span><strong>{bestScore}%<small>best MCQ score</small></strong><div><span><b>{attempts.length}</b><small>attempts</small></span><span><b>6</b><small>live MCQs</small></span><span><b>2</b><small>clinical formats</small></span></div></div>
      </header>

      <section className="assessment-subjects" aria-labelledby="assessment-subjects-title">
        <header className="section-header"><div><span className="eyebrow">Subject-specific practice</span><h2 id="assessment-subjects-title">Assessment availability</h2></div><span>Source-gated</span></header>
        <div><article className="is-live"><span>IM</span><div><strong>Internal Medicine I</strong><p>MCQs, SAQ, examination sequence, and timed foundation check.</p></div><b>Live</b></article><article><span>PM</span><div><strong>Perioperative Medicine I</strong><p>Unlocks after the relevant book-section mappings and lessons are approved.</p></div><b>Source needed</b></article><article><span>WC</span><div><strong>Women & Child Health I</strong><p>Unlocks after the relevant book-section mappings and lessons are approved.</p></div><b>Source needed</b></article></div>
      </section>

      <section id="timed-check" className="timed-assessment" aria-labelledby="timed-assessment-title">
        <header><div><span className="eyebrow">Timed mock · MCQ</span><h2 id="timed-assessment-title">{cardiovascularAssessment.title}</h2><p>{cardiovascularAssessment.subtitle}</p></div><div className={remaining === 0 ? "assessment-timer is-ended" : "assessment-timer"}><span>{remaining ? "Time remaining" : "Time elapsed"}</span><strong>{formatTime(remaining)}</strong></div></header>
        <form onSubmit={submitAssessment}>
          {cardiovascularAssessment.questions.map((question, questionIndex) => {
            const questionResult = result?.results.find((item) => item.questionId === question.id);
            return <fieldset className={questionResult ? questionResult.correct ? "is-correct" : "is-incorrect" : ""} key={question.id} disabled={submitting || Boolean(result)}><legend><span>{String(questionIndex + 1).padStart(2, "0")}</span>{question.prompt}</legend><div>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} /><span>{String.fromCharCode(65 + optionIndex)}</span><p>{option}</p></label>)}</div>{questionResult ? <aside><strong>{questionResult.correct ? "Correct" : "Correction"}</strong><p>{questionResult.correction}</p><small>{questionResult.sourceLabel}</small></aside> : null}</fieldset>;
          })}
          {message ? <p className="assessment-message" role="status">{message}</p> : null}
          <footer>{result ? <><a href="/mistakes">Review mistakes →</a><button type="button" onClick={() => { setAnswers({}); setResult(null); setMessage(""); setRemaining(cardiovascularAssessment.timeMinutes * 60); }}>Try again</button></> : <button type="submit" disabled={submitting}>{submitting ? "Checking…" : "Submit assessment"}<span>→</span></button>}</footer>
        </form>
      </section>

      <section className="clinical-practice" aria-labelledby="clinical-practice-title"><header className="section-header"><div><span className="eyebrow">Beyond MCQs</span><h2 id="clinical-practice-title">SAQ and Mini-OSCE practice</h2></div><span>Self-check scaffolds</span></header><div>{clinicalPracticeCards.map((card) => <article key={card.id}><span>{card.type}</span><h3>{card.title}</h3><p>{card.prompt}</p><aside><strong>Checkpoint</strong>{card.checkpoint}</aside><footer><small>{card.sourceLabel}</small><a href={card.href}>Open source route →</a></footer></article>)}</div></section>
    </div>
  );
}
