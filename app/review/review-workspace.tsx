"use client";

import { useCallback, useEffect, useState } from "react";

type ReviewRow = {
  id: string; lessonSlug: string; questionKey: string; question: string; answer: string;
  dueAt: string; repetitions: number; intervalDays: number; lastRating: string;
  signal: { difficulty: string; confidence: string; lapseCount: number; reviewCount: number; accuracyStreak: number; forgettingScore: number; nextIntervalDays: number } | null;
};

export function ReviewWorkspace() {
  const [due, setDue] = useState<ReviewRow[]>([]);
  const [upcoming, setUpcoming] = useState<ReviewRow[]>([]);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [saving, setSaving] = useState("");
  const [difficulty, setDifficulty] = useState<Record<string, "easy" | "medium" | "hard">>({});
  const [confidence, setConfidence] = useState<Record<string, "low" | "medium" | "high">>({});
  const [revealedAt, setRevealedAt] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");

  const loadQueue = useCallback(async () => {
    const response = await fetch("/api/reviews");
    if (!response.ok) return;
    const data = await response.json(); setDue(data.due ?? []); setUpcoming(data.upcoming ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/reviews").then((response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !data) return;
      setDue(data.due ?? []);
      setUpcoming(data.upcoming ?? []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function rate(row: ReviewRow, rating: "again" | "hard" | "good", responseMs: number) {
    setSaving(row.id);
    const response = await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonSlug: row.lessonSlug, questionKey: row.questionKey, question: row.question, answer: row.answer, rating, difficulty: difficulty[row.id] ?? "medium", confidence: confidence[row.id] ?? "medium", responseMs }) }).catch(() => null);
    const data = response?.ok ? await response.json() : null;
    if (data?.review) setFeedback(rating === "again" ? "Scheduled again in 10 minutes." : `Next review in ${data.review.intervalDays} ${data.review.intervalDays === 1 ? "day" : "days"}. ${data.rationale?.[2] ?? ""}`);
    setSaving(""); await loadQueue();
  }

  return (
    <div className="review-page">
      <header className="review-hero"><div><span className="eyebrow"><i /> Recommendation 31 · Adaptive memory</span><h1>Review what your memory<br />is ready to forget.</h1><p>Intervals now respond to accuracy, difficulty, confidence, response speed, and your own lapse history—not one rating alone.</p>{feedback ? <small className="review-feedback" role="status">{feedback}</small> : null}</div><div><span><strong>{due.length}</strong><small>due now</small></span><span><strong>{upcoming.length}</strong><small>scheduled</small></span></div></header>

      <section className="review-due" aria-labelledby="review-due-title">
        <header className="section-header"><div><span className="eyebrow">Due now</span><h2 id="review-due-title">Active recall</h2></div><a href="/learn">Return to subjects →</a></header>
        {due.length ? <div className="review-card-grid">{due.map((row) => {
          const isRevealed = revealed.includes(row.id);
          return <article key={row.id}><span>{row.lessonSlug.replaceAll("-", " ")}</span><h3>{row.question}</h3>{row.signal ? <div className="review-memory-signal"><small>{row.signal.lapseCount} lapses</small><small>{row.signal.accuracyStreak} correct streak</small><small>forgetting risk {row.signal.forgettingScore}%</small></div> : null}{isRevealed ? <div className="review-answer"><strong>Answer</strong><p>{row.answer}</p></div> : <p>Answer aloud before revealing.</p>}{isRevealed ? <><div className="review-self-check"><label>Difficulty<select value={difficulty[row.id] ?? "medium"} onChange={(event) => setDifficulty((current) => ({ ...current, [row.id]: event.target.value as "easy" | "medium" | "hard" }))}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label>Confidence<select value={confidence[row.id] ?? "medium"} onChange={(event) => setConfidence((current) => ({ ...current, [row.id]: event.target.value as "low" | "medium" | "high" }))}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><div className="review-rating"><button disabled={saving === row.id} onClick={(event) => rate(row, "again", event.timeStamp - (revealedAt[row.id] ?? event.timeStamp))} type="button">Again <small>incorrect</small></button><button disabled={saving === row.id} onClick={(event) => rate(row, "hard", event.timeStamp - (revealedAt[row.id] ?? event.timeStamp))} type="button">Hard <small>correct effort</small></button><button disabled={saving === row.id} onClick={(event) => rate(row, "good", event.timeStamp - (revealedAt[row.id] ?? event.timeStamp))} type="button">Good <small>correct recall</small></button></div></> : <button className="review-reveal" type="button" onClick={(event) => { setRevealed((current) => [...current, row.id]); setRevealedAt((current) => ({ ...current, [row.id]: event.timeStamp })); }}>Reveal answer →</button>}</article>;
        })}</div> : <div className="review-empty"><span>✓</span><h3>No cards are due right now.</h3><p>Rate recall questions inside Professor Mode to build your personal review schedule.</p><a href="/learn/cardiovascular/cardiac-cycle#recall">Practise cardiac-cycle recall</a></div>}
      </section>

      <section className="review-upcoming"><header className="section-header"><div><span className="eyebrow">Coming back later</span><h2>Scheduled reviews</h2></div><span>{upcoming.length} cards</span></header><div>{upcoming.slice(0, 12).map((row) => <article key={row.id}><span>{row.lessonSlug.replaceAll("-", " ")}</span><strong>{row.question}</strong><small>Due {new Date(row.dueAt).toLocaleString("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}{row.signal ? ` · risk ${row.signal.forgettingScore}%` : ""}</small></article>)}</div></section>
    </div>
  );
}
