"use client";

import { useCallback, useEffect, useState } from "react";

type QueueTask = { key: string; category: string; title: string; reason: string; href: string; action: string; minutes: number; priority: number; evidence: string; order: number; status: string };
type Summary = { total: number; completed: number; pending: number; minutes: number; dueReviews: number; dueMistakes: number };

const categoryLabels: Record<string, string> = { lesson: "Learn", recall: "Recall", mistake: "Correct", practice: "Practise", revision: "Verify" };

export function DailyQueueWorkspace() {
  const [dateKey, setDateKey] = useState("");
  const [queue, setQueue] = useState<QueueTask[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, completed: 0, pending: 0, minutes: 0, dueReviews: 0, dueMistakes: 0 });
  const [working, setWorking] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/daily-queue");
    if (!response.ok) return;
    const data = await response.json(); setDateKey(data.dateKey ?? ""); setQueue(data.queue ?? []); if (data.summary) setSummary(data.summary);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/daily-queue").then((response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !data) return;
      setDateKey(data.dateKey ?? ""); setQueue(data.queue ?? []); if (data.summary) setSummary(data.summary);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function toggle(task: QueueTask) {
    setWorking(task.key);
    await fetch("/api/daily-queue", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskKey: task.key, status: task.status === "completed" ? "pending" : "completed" }) }).catch(() => undefined);
    setWorking(""); await load();
  }

  return <div className="daily-queue-page">
    <header className="daily-queue-hero"><div><span className="eyebrow"><i /> Recommendation 30 · Adaptive daily queue</span><h1>Do the highest-value<br />learning first.</h1><p>Today’s sequence is rebuilt from due dates, forgetting risk, unresolved mistakes, lesson completion, approved questions, and recent assessment accuracy.</p><small>{dateKey ? `Plan for ${new Date(`${dateKey}T00:00:00+05:30`).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })}` : "Preparing today’s evidence…"}</small></div><div className="daily-queue-ring" style={{ "--queue-progress": `${summary.total ? Math.round(summary.completed / summary.total * 100) : 0}%` } as React.CSSProperties}><strong>{summary.completed}/{summary.total}</strong><span>tasks complete</span><small>{summary.minutes} min remaining</small></div></header>

    <section className="daily-queue-summary" aria-label="Today’s priorities"><span><strong>{summary.dueMistakes}</strong><small>mistakes due</small></span><span><strong>{summary.dueReviews}</strong><small>recall cards due</small></span><span><strong>{summary.pending}</strong><small>tasks remaining</small></span><span><strong>{summary.minutes}</strong><small>focused minutes</small></span></section>

    <section className="daily-queue-list" aria-labelledby="daily-queue-title"><header className="section-header"><div><span className="eyebrow">Ordered by learning value</span><h2 id="daily-queue-title">Today’s sequence</h2></div><span>Complete in order or choose what fits</span></header>{queue.length ? <div>{queue.map((task) => <article className={`daily-task daily-task--${task.category} ${task.status === "completed" ? "is-complete" : ""}`} key={task.key}><button type="button" aria-label={task.status === "completed" ? `Mark ${task.title} pending` : `Mark ${task.title} complete`} onClick={() => toggle(task)} disabled={working === task.key}>{task.status === "completed" ? "✓" : task.order}</button><div><span>{categoryLabels[task.category] ?? task.category} · {task.minutes} min</span><h3>{task.title}</h3><p>{task.reason}</p><small>{task.evidence}</small></div><a href={task.href}>{task.action} <span>→</span></a></article>)}</div> : <div className="daily-queue-empty"><span>✓</span><h3>Your queue is clear.</h3><p>New learning evidence or a due review will create the next task automatically.</p></div>}</section>

    <aside className="daily-queue-rule"><span>⌁</span><div><strong>The queue explains every choice.</strong><p>Priority comes from your own saved evidence. It never marks an objective mastered merely because a page was opened.</p></div><a href="/coverage">Inspect objective evidence</a></aside>
  </div>;
}
