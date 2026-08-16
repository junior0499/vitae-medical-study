"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useEffect, useMemo, useState } from "react";

type StudyTask = {
  id: number;
  label: string;
  meta: string;
  done: boolean;
  tone: "teal" | "coral" | "violet";
};

const initialTasks: StudyTask[] = [
  { id: 1, label: "Cardiac cycle: pressure loops", meta: "Learn · 32 min", done: true, tone: "teal" },
  { id: 2, label: "Heart sounds — active recall", meta: "Recall · 18 cards", done: false, tone: "coral" },
  { id: 3, label: "Acute chest pain mini-case", meta: "Apply · 15 min", done: false, tone: "violet" },
];

const aiReplies: Record<string, string> = {
  "Explain preload simply": "Think of preload as the stretch in the ventricle just before it contracts—the amount of blood waiting to be pushed out. More filling usually means more stretch and a stronger next contraction, within limits.",
  "Quiz me on heart sounds": "First question: which valve closure creates S1, and at what point in the cardiac cycle does it occur? Answer aloud before revealing your notes.",
  "Build a 30-minute plan": "Try 12 minutes to learn one concept, 8 minutes to close your notes and recall it, 7 minutes on a clinical question, then 3 minutes to write what still feels unclear.",
};

const systemCards = [
  { code: "CV", title: "Cardiovascular", detail: "8 of 13 foundations", progress: 62, color: "teal", status: "In progress" },
  { code: "RS", title: "Respiratory", detail: "4 of 11 foundations", progress: 36, color: "blue", status: "Continue" },
  { code: "RN", title: "Renal", detail: "2 of 10 foundations", progress: 20, color: "violet", status: "Build basics" },
  { code: "OB", title: "Obstetrics", detail: "6 of 12 foundations", progress: 50, color: "coral", status: "In progress" },
];

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export default function Home() {
  const [tasks, setTasks] = useState(initialTasks);
  const [seconds, setSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (!timerRunning || seconds <= 0) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [seconds, timerRunning]);

  const completedCount = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  const dailyProgress = Math.round((completedCount / tasks.length) * 100);

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task));
  }

  function resetTimer() {
    setTimerRunning(false);
    setSeconds(25 * 60);
  }

  function askAtlas(prompt: string) {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;
    setQuestion(cleanPrompt);
    setAnswer(aiReplies[cleanPrompt] ?? "Let’s unpack that in three moves: name the normal physiology, identify what changes, then connect the change to the clinical finding. Start by telling me what you already know, even if it is only one sentence.");
    setAiOpen(true);
  }

  function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askAtlas(question);
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to study dashboard</a>

      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Poh-tah-toh home">
          <span className="brand-mark" aria-hidden="true" />
          <span><strong>Poh-tah-toh</strong><small>medical study</small></span>
        </a>

        <nav className="side-nav">
          <a className="active" href="/"><span aria-hidden="true">⌂</span>Overview</a>
          <a href="/learn"><span aria-hidden="true">◎</span>Learn</a>
          <a href="/alignment"><span aria-hidden="true">⌁</span>Source map</a>
          <a href="/learn/cardiovascular/cardiac-cycle#recall"><span aria-hidden="true">↻</span>Recall<b>18</b></a>
          <a href="#schedule"><span aria-hidden="true">□</span>Planner</a>
          <a href="/library"><span aria-hidden="true">▤</span>Library</a>
        </nav>

        <div className="semester-card">
          <span>Current semester</span>
          <strong>Semester 7</strong>
          <div><i style={{ width: "62%" }} /><b>62%</b></div>
          <small>3 clinical blocks mapped</small>
        </div>

        <div className="sidebar-footer">
          <span className="avatar">AK</span>
          <span><strong>Aanya Kapoor</strong><small>Medical student</small></span>
          <button type="button" aria-label="Open account menu">•••</button>
        </div>
      </aside>

      <main id="main-content" className="main" tabIndex={-1}>
        <header id="top" className="topbar">
          <div className="mobile-brand"><span className="brand-mark" aria-hidden="true" /><strong>Poh-tah-toh</strong></div>
          <div className="topbar-copy">
            <span>My learning space</span>
            <strong>Semester 7 · Clinical foundations</strong>
          </div>
          <div className="topbar-actions">
            <button className="search-button" type="button" onClick={() => setAiOpen(true)} aria-label="Open study assistant">
              <span aria-hidden="true">⌕</span><span>Search or ask...</span><kbd>⌘ K</kbd>
            </button>
            <button
              className={`timer-button ${timerRunning ? "is-running" : ""}`}
              type="button"
              onClick={() => setTimerRunning((current) => !current)}
              aria-label={timerRunning ? "Pause focus timer" : "Start focus timer"}
            >
              <span aria-hidden="true">◷</span>{timerRunning || seconds < 25 * 60 ? formatTimer(seconds) : "Focus"}
            </button>
          </div>
        </header>

        <div className="dashboard">
          <section className="welcome-row" aria-labelledby="welcome-heading">
            <div>
              <span className="eyebrow"><i /> Your study desk</span>
              <h1 id="welcome-heading">Good morning, Aanya.</h1>
              <p>One clear concept at a time. Your next best study step is ready.</p>
            </div>
            <div className="exam-countdown" aria-label="Internal Medicine exam in 38 days">
              <span>Next exam</span>
              <strong>38 <small>days</small></strong>
              <p>Internal Medicine I</p>
            </div>
          </section>

          <section className="hero-card" aria-labelledby="continue-title">
            <div className="hero-copy">
              <span className="hero-kicker"><b>Continue learning</b><i>32 min</i></span>
              <h2 id="continue-title">The cardiac cycle,<br />made <em>visual.</em></h2>
              <p>Follow pressure, volume, valves, and heart sounds through one complete heartbeat—then test the connections.</p>
              <div className="hero-actions">
                <a className="primary-button" href="/learn/cardiovascular/cardiac-cycle">Resume lesson <span aria-hidden="true">→</span></a>
                <button className="text-button" type="button" onClick={() => askAtlas("Explain preload simply")}>Ask Atlas first <span aria-hidden="true">↗</span></button>
              </div>
              <div className="source-note"><span aria-hidden="true">✓</span><b>Syllabus-linked</b><i />Last studied yesterday</div>
            </div>

            <div className="cycle-visual" aria-label="Cardiac foundations progress: 62 percent">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="cycle-ring" style={{ "--progress": "62%" } as React.CSSProperties}>
                <span><strong>62%</strong><small>foundation<br />complete</small></span>
              </div>
              <div className="cycle-step step-one"><i>1</i><span><b>Fill</b><small>Diastole</small></span></div>
              <div className="cycle-step step-two"><i>2</i><span><b>Contract</b><small>Systole</small></span></div>
              <div className="cycle-step step-three"><i>3</i><span><b>Eject</b><small>Forward flow</small></span></div>
            </div>
          </section>

          <section className="content-grid">
            <article id="today" className="panel plan-panel">
              <header className="panel-header">
                <div><span className="eyebrow">Your study prescription</span><h2>Today&apos;s plan</h2></div>
                <span className="progress-label">{completedCount} of {tasks.length} done</span>
              </header>
              <div className="plan-progress" aria-label={`${dailyProgress}% of today's plan completed`}><i style={{ width: `${dailyProgress}%` }} /></div>
              <div className="task-list">
                {tasks.map((task, index) => (
                  <label className={`task-row ${task.done ? "is-done" : ""}`} key={task.id}>
                    <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                    <span className={`task-check task-check--${task.tone}`} aria-hidden="true">{task.done ? "✓" : index + 1}</span>
                    <span className="task-copy"><strong>{task.label}</strong><small>{task.meta}</small></span>
                    <span className="task-arrow" aria-hidden="true">→</span>
                  </label>
                ))}
              </div>
              <footer><span>About 1 hr 5 min remaining</span><a href="/learn">Adjust plan</a></footer>
            </article>

            <article id="schedule" className="panel schedule-panel">
              <header className="panel-header">
                <div><span className="eyebrow">Tuesday · 11 August</span><h2>Clinical rhythm</h2></div>
                <button type="button" aria-label="Open full calendar">•••</button>
              </header>
              <div className="timeline">
                <div><time>09:00</time><i className="line-dot line-dot--teal" /><span><strong>Cardiology lecture</strong><small>Clinical block · Room 4.12</small></span></div>
                <div className="now"><time>13:30</time><i className="line-dot line-dot--coral" /><span><strong>Focused study block</strong><small>Cardiac cycle · 50 min</small></span><b>Now</b></div>
                <div><time>17:00</time><i className="line-dot line-dot--violet" /><span><strong>Recall review</strong><small>18 cards due</small></span></div>
              </div>
              <div className="calm-note"><span aria-hidden="true">✦</span><p><strong>A sustainable day.</strong><br />You have 40 minutes of buffer between blocks.</p></div>
            </article>
          </section>

          <section id="systems" className="systems-section" aria-labelledby="systems-title">
            <header className="section-header">
              <div><span className="eyebrow">Foundation before disease</span><h2 id="systems-title">Your clinical systems</h2></div>
              <a href="/learn">View syllabus map <span aria-hidden="true">→</span></a>
            </header>
            <div className="system-grid">
              {systemCards.map((system) => (
                <article className="system-card" key={system.code}>
                  <div className={`system-icon system-icon--${system.color}`}>{system.code}</div>
                  <span className="system-status">{system.status}</span>
                  <h3>{system.title}</h3>
                  <p>{system.detail}</p>
                  <div className={`system-progress system-progress--${system.color}`}><i style={{ width: `${system.progress}%` }} /></div>
                  <footer><strong>{system.progress}%</strong><a href={system.code === "CV" ? "/learn/cardiovascular/cardiac-cycle" : "/learn"} aria-label={`Open ${system.title}`}>↗</a></footer>
                </article>
              ))}
            </div>
          </section>

          <section className="insight-grid">
            <article className="panel momentum-panel">
              <header className="panel-header">
                <div><span className="eyebrow">Consistency over cramming</span><h2>Weekly pulse</h2></div>
                <span className="streak-pill">🔥 6 day streak</span>
              </header>
              <div className="momentum-summary"><strong>8h 40m</strong><span>focused this week</span><small>↗ 12% from last week</small></div>
              <div className="bar-chart" aria-label="Study minutes this week: Monday 68, Tuesday 80, Wednesday 54, Thursday 92, Friday 70, Saturday 42, Sunday 0">
                {[68, 80, 54, 92, 70, 42, 0].map((height, index) => (
                  <div key={index}><span className={index === 3 ? "is-high" : ""} style={{ height: `${Math.max(height, 4)}%` }}><i>{height ? `${height}m` : "Rest"}</i></span><small>{["M", "T", "W", "T", "F", "S", "S"][index]}</small></div>
                ))}
              </div>
            </article>

            <article className="atlas-card">
              <div className="atlas-orb" aria-hidden="true"><i /><span>✦</span></div>
              <span className="eyebrow">Atlas · Study companion</span>
              <h2>Stuck? Think it through together.</h2>
              <p>Ask for a simpler explanation, a recall quiz, or a plan for the time you have.</p>
              <div className="prompt-list">
                {Object.keys(aiReplies).map((prompt) => <button type="button" key={prompt} onClick={() => askAtlas(prompt)}>{prompt}<span>→</span></button>)}
              </div>
              <button className="atlas-open" type="button" onClick={() => setAiOpen(true)}>Open Atlas <span aria-hidden="true">✦</span></button>
            </article>
          </section>

          <footer className="page-footer"><span>Poh-tah-toh helps you learn medicine with intention.</span><span>Source-aware · Student-first · Always private</span></footer>
        </div>
      </main>

      {timerRunning || seconds < 25 * 60 ? (
        <aside className="focus-dock" aria-live="polite">
          <span><i className={timerRunning ? "pulse-dot" : ""} />Focus block</span>
          <strong>{formatTimer(seconds)}</strong>
          <button type="button" onClick={() => setTimerRunning((current) => !current)}>{timerRunning ? "Pause" : "Resume"}</button>
          <button type="button" onClick={resetTimer} aria-label="Reset focus timer">×</button>
        </aside>
      ) : null}

      {aiOpen ? (
        <div className="assistant-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setAiOpen(false); }}>
          <section className="assistant-panel" role="dialog" aria-modal="true" aria-labelledby="atlas-title">
            <header><div className="mini-orb">✦</div><span><strong id="atlas-title">Atlas</strong><small>Your thinking companion</small></span><button type="button" onClick={() => setAiOpen(false)} aria-label="Close Atlas">×</button></header>
            <div className="assistant-body">
              <span className="assistant-label">Study mode · Guided, not spoon-fed</span>
              {answer ? (
                <div className="conversation" aria-live="polite"><p className="student-message">{question}</p><div className="atlas-message"><span>✦</span><p>{answer}</p></div></div>
              ) : (
                <div className="assistant-welcome"><span>✦</span><h2>What are we working through?</h2><p>I can simplify a concept, test your recall, or help shape a focused study block.</p></div>
              )}
              <div className="assistant-prompts">{Object.keys(aiReplies).map((prompt) => <button type="button" key={prompt} onClick={() => askAtlas(prompt)}>{prompt}</button>)}</div>
            </div>
            <form onSubmit={handleAsk}><label className="sr-only" htmlFor="atlas-question">Ask Atlas a study question</label><input id="atlas-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a medical study question..." /><button type="submit" aria-label="Send question">↑</button></form>
            <footer>Atlas supports your learning and does not replace clinical guidance.</footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
