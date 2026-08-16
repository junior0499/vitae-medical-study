"use client";

import { useCallback, useEffect, useState } from "react";

type ReviewRow = {
  id: string; lessonSlug: string; questionKey: string; question: string; answer: string;
  dueAt: string; repetitions: number; intervalDays: number; lastRating: string;
};

export function ReviewWorkspace() {
  const [due, setDue] = useState<ReviewRow[]>([]);
  const [upcoming, setUpcoming] = useState<ReviewRow[]>([]);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [saving, setSaving] = useState("");

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

  async function rate(row: ReviewRow, rating: "again" | "hard" | "good") {
    setSaving(row.id);
    await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonSlug: row.lessonSlug, questionKey: row.questionKey, question: row.question, answer: row.answer, rating }) }).catch(() => undefined);
    setSaving(""); await loadQueue();
  }

  return (
    <div className="review-page">
      <header className="review-hero"><div><span className="eyebrow"><i /> Smart recall queue</span><h1>Review what your memory<br />is ready to forget.</h1><p>Cards return according to your own rating. “Again” comes back soon, “Hard” stays close, and “Good” earns a longer interval.</p></div><div><span><strong>{due.length}</strong><small>due now</small></span><span><strong>{upcoming.length}</strong><small>scheduled</small></span></div></header>

      <section className="review-due" aria-labelledby="review-due-title">
        <header className="section-header"><div><span className="eyebrow">Due now</span><h2 id="review-due-title">Active recall</h2></div><a href="/learn">Return to subjects →</a></header>
        {due.length ? <div className="review-card-grid">{due.map((row) => {
          const isRevealed = revealed.includes(row.id);
          return <article key={row.id}><span>{row.lessonSlug.replaceAll("-", " ")}</span><h3>{row.question}</h3>{isRevealed ? <div className="review-answer"><strong>Answer</strong><p>{row.answer}</p></div> : <p>Answer aloud before revealing.</p>}{isRevealed ? <div className="review-rating"><button disabled={saving === row.id} onClick={() => rate(row, "again")} type="button">Again <small>10 min</small></button><button disabled={saving === row.id} onClick={() => rate(row, "hard")} type="button">Hard <small>close</small></button><button disabled={saving === row.id} onClick={() => rate(row, "good")} type="button">Good <small>longer</small></button></div> : <button className="review-reveal" type="button" onClick={() => setRevealed((current) => [...current, row.id])}>Reveal answer →</button>}</article>;
        })}</div> : <div className="review-empty"><span>✓</span><h3>No cards are due right now.</h3><p>Rate recall questions inside Professor Mode to build your personal review schedule.</p><a href="/learn/cardiovascular/cardiac-cycle#recall">Practise cardiac-cycle recall</a></div>}
      </section>

      <section className="review-upcoming"><header className="section-header"><div><span className="eyebrow">Coming back later</span><h2>Scheduled reviews</h2></div><span>{upcoming.length} cards</span></header><div>{upcoming.slice(0, 12).map((row) => <article key={row.id}><span>{row.lessonSlug.replaceAll("-", " ")}</span><strong>{row.question}</strong><small>Due {new Date(row.dueAt).toLocaleString("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</small></article>)}</div></section>
    </div>
  );
}
