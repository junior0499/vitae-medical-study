"use client";

import { useEffect, useMemo, useState } from "react";

type ProgressRow = { lessonSlug: string; completedPoints: number; totalPoints: number; status: string };

const otherSystems = [
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
  const cardiacOutput = useMemo(() => progress.find((row) => row.lessonSlug === "cardiac-output"), [progress]);
  const cardiacPercent = cardiac ? Math.round((cardiac.completedPoints / cardiac.totalPoints) * 100) : 0;
  const outputPercent = cardiacOutput ? Math.round((cardiacOutput.completedPoints / cardiacOutput.totalPoints) * 100) : 0;
  const cardiacComplete = cardiac?.status === "complete" || cardiacPercent === 100;
  const outputComplete = cardiacOutput?.status === "complete" || outputPercent === 100;
  const currentTitle = cardiacComplete ? "Cardiac output" : "The cardiac cycle";
  const currentHref = cardiacComplete ? "/learn/cardiovascular/cardiac-output" : "/learn/cardiovascular/cardiac-cycle";
  const currentPercent = cardiacComplete ? outputPercent : cardiacPercent;
  const systems = [
    {
      code: "CV", title: "Cardiovascular", color: "teal", progress: outputComplete ? 68 : cardiacComplete ? 65 : 62, lessons: 13,
      description: "Flow, pressure and electrical timing before clinical cardiology.",
      next: outputComplete ? "Blood pressure (planned)" : currentTitle, href: outputComplete ? "#coming-next" : currentHref,
      topics: ["Heart anatomy", "Blood flow", "Conduction", cardiacComplete ? "Cardiac output" : "Cardiac cycle"],
    },
    ...otherSystems,
  ];
  const routeItems = [
    { label: "Blood-flow pathway", complete: true },
    { label: "Heart structure", complete: true },
    { label: "Electrical conduction", complete: true },
    { label: "Cardiac cycle", complete: cardiacComplete, current: !cardiacComplete, href: "/learn/cardiovascular/cardiac-cycle" },
    { label: "Cardiac output", complete: outputComplete, current: cardiacComplete && !outputComplete, href: "/learn/cardiovascular/cardiac-output" },
    { label: "Blood pressure", complete: false },
    { label: "Coronary control", complete: false },
    { label: "ECG & examination", complete: false },
  ];

  return (
    <div className="learning-page">
      <header className="learn-hero">
        <div>
          <span className="eyebrow"><i /> Foundation-first pathway</span>
          <h1>Build the body before<br />you treat the disease.</h1>
          <p>Move through normal anatomy and physiology in a deliberate sequence. Every lesson ends with recall, notes, and a clinical connection.</p>
          <div className="learn-hero-actions"><a className="primary-button primary-button--dark" href={currentHref}>Continue {currentTitle.toLowerCase()} <span>→</span></a><a href="/alignment">Review source map</a></div>
        </div>
        <div className="route-summary">
          <span>Your learning route</span>
          <strong>Foundations <i>→</i> Recognition <i>→</i> Clinical reasoning</strong>
          <div><span><b>4</b><small>systems</small></span><span><b>46</b><small>foundation lessons</small></span><span><b>{currentPercent}%</b><small>current lesson</small></span></div>
        </div>
      </header>

      <section className="current-route" aria-labelledby="route-title">
        <header className="section-header"><div><span className="eyebrow">Recommended sequence</span><h2 id="route-title">Cardiovascular route</h2></div><span>{cardiacComplete ? "4" : "3"} foundations complete · {outputComplete ? "Blood pressure planned" : `${currentTitle} next`}</span></header>
        <div className="route-track" role="list" aria-label="Cardiovascular foundation sequence">
          {routeItems.map((item, index) => (
            <div className={`${item.complete ? "is-complete" : ""} ${item.current ? "is-current" : ""}`} role="listitem" key={item.label}>
              <span>{item.complete ? "✓" : index + 1}</span><strong>{item.label}</strong><small>{item.complete ? "Complete" : item.current ? "Continue now" : "Locked in sequence"}</small>
              {item.href ? <a href={item.href}>{item.complete ? "Review" : "Open lesson"} →</a> : null}
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

      <section id="coming-next" className="coming-next"><span aria-hidden="true">✦</span><div><strong>One system at a time.</strong><p>{outputComplete ? "Cardiac output is complete. Blood pressure is the next planned foundation." : `${currentTitle} is ready now, with its source trail, recall, notes, and saved progress connected.`}</p></div><a href={currentHref}>{outputComplete ? "Review lesson" : "Start lesson"}</a></section>
    </div>
  );
}
