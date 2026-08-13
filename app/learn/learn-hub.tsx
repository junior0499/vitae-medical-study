"use client";

import { useEffect, useMemo, useState } from "react";

type ProgressRow = { lessonSlug: string; completedPoints: number; totalPoints: number; status: string };

const systems = [
  {
    code: "CV", title: "Cardiovascular", color: "teal", progress: 62, lessons: 13,
    description: "Flow, pressure and electrical timing before clinical cardiology.",
    next: "The cardiac cycle", href: "/learn/cardiovascular/cardiac-cycle",
    topics: ["Heart anatomy", "Blood flow", "Conduction", "Cardiac cycle"],
  },
  {
    code: "RS", title: "Respiratory", color: "blue", progress: 36, lessons: 11,
    description: "Ventilation, gas exchange and mechanics before respiratory disease.",
    next: "Pressure gradients", href: "#coming-next",
    topics: ["Airway anatomy", "Ventilation", "Perfusion", "Gas exchange"],
  },
  {
    code: "RN", title: "Renal", color: "violet", progress: 20, lessons: 10,
    description: "Nephron handling, GFR and fluid balance before renal medicine.",
    next: "Meet the nephron", href: "#coming-next",
    topics: ["Nephron map", "Filtration", "Tubular handling", "Acid–base"],
  },
  {
    code: "OB", title: "Obstetrics", color: "coral", progress: 50, lessons: 12,
    description: "Reproductive and placental physiology before obstetric care.",
    next: "Placental circulation", href: "#coming-next",
    topics: ["Cycle control", "Implantation", "Placenta", "Fetal circulation"],
  },
];

export function LearnHub() {
  const [progress, setProgress] = useState<ProgressRow[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/progress").then((response) => response.ok ? response.json() : null).then((data) => {
      if (active && data?.progress) setProgress(data.progress);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const cardiac = useMemo(() => progress.find((row) => row.lessonSlug === "cardiac-cycle"), [progress]);
  const cardiacPercent = cardiac ? Math.round((cardiac.completedPoints / cardiac.totalPoints) * 100) : 0;

  return (
    <div className="learning-page">
      <header className="learn-hero">
        <div>
          <span className="eyebrow"><i /> Foundation-first pathway</span>
          <h1>Build the body before<br />you treat the disease.</h1>
          <p>Move through normal anatomy and physiology in a deliberate sequence. Every lesson ends with recall, notes, and a clinical connection.</p>
          <div className="learn-hero-actions"><a className="primary-button primary-button--dark" href="/learn/cardiovascular/cardiac-cycle">Continue cardiac cycle <span>→</span></a><a href="/alignment">Review source map</a></div>
        </div>
        <div className="route-summary">
          <span>Your learning route</span>
          <strong>Foundations <i>→</i> Recognition <i>→</i> Clinical reasoning</strong>
          <div><span><b>4</b><small>systems</small></span><span><b>46</b><small>foundation lessons</small></span><span><b>{cardiacPercent}%</b><small>current lesson</small></span></div>
        </div>
      </header>

      <section className="current-route" aria-labelledby="route-title">
        <header className="section-header"><div><span className="eyebrow">Recommended sequence</span><h2 id="route-title">Cardiovascular route</h2></div><span>3 foundations complete · Cardiac cycle next</span></header>
        <div className="route-track" role="list" aria-label="Cardiovascular foundation sequence">
          {["Blood-flow pathway", "Heart structure", "Electrical conduction", "Cardiac cycle", "Cardiac output", "Blood pressure", "Coronary control", "ECG & examination"].map((label, index) => (
            <div className={`${index < 3 ? "is-complete" : ""} ${index === 3 ? "is-current" : ""}`} role="listitem" key={label}>
              <span>{index < 3 ? "✓" : index + 1}</span><strong>{label}</strong><small>{index < 3 ? "Complete" : index === 3 ? "Continue now" : "Locked in sequence"}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="coming-next source-map-promo"><span aria-hidden="true">⌁</span><div><strong>30 syllabus topic groups are now connected to your books.</strong><p>See the recommended chapter, verified PDF starting page, supporting sources, and every open edition check.</p></div><a href="/alignment">Open source map</a></section>

      <section className="system-curriculum" aria-labelledby="curriculum-title">
        <header className="section-header"><div><span className="eyebrow">System curriculum</span><h2 id="curriculum-title">Choose a clinical system</h2></div><a href="/library">Manage sources →</a></header>
        <div className="curriculum-grid">
          {systems.map((system) => (
            <article className="curriculum-card" key={system.code}>
              <header><span className={`system-icon system-icon--${system.color}`}>{system.code}</span><span>{system.lessons} lessons</span></header>
              <h3>{system.title}</h3><p>{system.description}</p>
              <div className="topic-pills">{system.topics.map((topic, index) => <span className={index < Math.round(system.progress / 25) ? "is-ready" : ""} key={topic}>{topic}</span>)}</div>
              <div className={`system-progress system-progress--${system.color}`}><i style={{ width: `${system.progress}%` }} /></div>
              <footer><span><small>Next lesson</small><strong>{system.next}</strong></span><a href={system.href} aria-label={`Open ${system.title}`}>→</a></footer>
            </article>
          ))}
        </div>
      </section>

      <section id="coming-next" className="coming-next"><span aria-hidden="true">✦</span><div><strong>One system at a time.</strong><p>The cardiac cycle lesson is ready now. Remaining lessons will unlock as the complete curriculum is added.</p></div><a href="/learn/cardiovascular/cardiac-cycle">Start lesson</a></section>
    </div>
  );
}
