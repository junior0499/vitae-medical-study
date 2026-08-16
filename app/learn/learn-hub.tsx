"use client";

import { useEffect, useMemo, useState } from "react";

type ProgressRow = { lessonSlug: string; completedPoints: number; totalPoints: number; status: string };
type SubjectId = "internal-medicine" | "perioperative-medicine" | "women-child-health";
type ClinicalArea = {
  code: string;
  title: string;
  color: string;
  description: string;
  topics: string[];
  state: "live" | "mapped" | "planned";
};

const clinicalSubjects: Array<{
  id: SubjectId;
  code: string;
  title: string;
  shortTitle: string;
  color: string;
  description: string;
  coverage: string;
  areas: ClinicalArea[];
}> = [
  {
    id: "internal-medicine",
    code: "IM",
    title: "Internal Medicine I",
    shortTitle: "Internal Medicine",
    color: "teal",
    description: "Build normal system foundations, then connect examination, investigations, and clinical disease.",
    coverage: "3 clinical systems · source map available",
    areas: [
      { code: "CV", title: "Cardiovascular", color: "teal", description: "Flow, pressure and electrical timing before clinical cardiology.", topics: ["Heart anatomy", "Blood flow", "Conduction", "Cardiac output"], state: "live" },
      { code: "RS", title: "Respiratory", color: "blue", description: "Ventilation, gas exchange and mechanics before respiratory disease.", topics: ["Airway anatomy", "Ventilation", "Perfusion", "Gas exchange"], state: "mapped" },
      { code: "RN", title: "Renal", color: "violet", description: "Nephron handling, filtration and fluid balance before renal medicine.", topics: ["Nephron map", "Filtration", "Tubular handling", "Acid–base"], state: "mapped" },
    ],
  },
  {
    id: "perioperative-medicine",
    code: "PM",
    title: "Perioperative Medicine I",
    shortTitle: "Perioperative",
    color: "blue",
    description: "Connect surgical foundations, trauma, orthopaedics, immobilization, and recovery around the patient journey.",
    coverage: "4 clinical blocks · syllabus structure ready",
    areas: [
      { code: "SG", title: "Surgery", color: "blue", description: "Core surgical principles from assessment and preparation to safe operative care.", topics: ["Surgical assessment", "Fluids", "Wound healing", "Infection"], state: "planned" },
      { code: "TR", title: "Trauma", color: "coral", description: "A structured approach to the injured patient before organ-specific management.", topics: ["Primary survey", "Shock", "Initial stabilization", "Secondary survey"], state: "planned" },
      { code: "OR", title: "Orthopaedics", color: "violet", description: "Musculoskeletal injury, fracture principles, examination, and safe immobilization.", topics: ["Bone & joint", "Fractures", "Limb examination", "Immobilization"], state: "planned" },
      { code: "PO", title: "Postoperative care", color: "teal", description: "Recognize normal recovery and detect common postoperative problems early.", topics: ["Recovery", "Pain", "Monitoring", "Complications"], state: "planned" },
    ],
  },
  {
    id: "women-child-health",
    code: "WC",
    title: "Women & Child Health I",
    shortTitle: "Women & Child Health",
    color: "coral",
    description: "Follow reproductive, maternal, newborn, pediatric, and developmental care as one connected life-course subject.",
    coverage: "4 clinical areas · syllabus structure ready",
    areas: [
      { code: "OG", title: "Obstetrics & Gynaecology", color: "coral", description: "Reproductive foundations, pregnancy, maternal physiology, and women’s health.", topics: ["Reproductive cycle", "Pregnancy", "Placenta", "Maternal care"], state: "planned" },
      { code: "PD", title: "Pediatrics", color: "blue", description: "Age-aware assessment, growth, development, and care of the child.", topics: ["Child assessment", "Growth", "Development", "Nutrition"], state: "planned" },
      { code: "NN", title: "Neonatology", color: "teal", description: "The transition to newborn life, initial assessment, and essential neonatal care.", topics: ["Birth transition", "Newborn exam", "Feeding", "Neonatal care"], state: "planned" },
      { code: "HD", title: "Human development", color: "violet", description: "Connect milestones and developmental change from infancy through adolescence.", topics: ["Milestones", "Motor", "Language", "Social development"], state: "planned" },
    ],
  },
];

export function LearnHub() {
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [activeSubject, setActiveSubject] = useState<SubjectId>("internal-medicine");

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
  const selectedSubject = clinicalSubjects.find((subject) => subject.id === activeSubject) ?? clinicalSubjects[0];
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

  function openSubject(subjectId: SubjectId) {
    setActiveSubject(subjectId);
    document.getElementById("subject-curriculum")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="learning-page">
      <header className="learn-hero">
        <div>
          <span className="eyebrow"><i /> Semester 7 · Clinical subjects</span>
          <h1>Choose the subject.<br />Then build the system.</h1>
          <p>Vitae now follows your university subjects first. Inside each subject, move through its clinical systems from normal foundations to recognition and clinical reasoning.</p>
          <div className="learn-hero-actions"><a className="primary-button primary-button--dark" href={currentHref}>Continue {currentTitle.toLowerCase()} <span>→</span></a><a href="#clinical-subjects">See all subjects</a></div>
        </div>
        <div className="route-summary">
          <span>Your Semester 7 structure</span>
          <strong>Subject <i>→</i> Clinical system <i>→</i> Lesson</strong>
          <div><span><b>3</b><small>clinical subjects</small></span><span><b>11</b><small>clinical areas</small></span><span><b>{currentPercent}%</b><small>current lesson</small></span></div>
        </div>
      </header>

      <section id="clinical-subjects" className="clinical-subjects" aria-labelledby="clinical-subjects-title">
        <header className="section-header"><div><span className="eyebrow">Your university subjects</span><h2 id="clinical-subjects-title">Choose a clinical subject</h2></div><a href="/library">Manage subject sources →</a></header>
        <div className="subject-grid">
          {clinicalSubjects.map((subject) => (
            <button type="button" className={`subject-card subject-card--${subject.color} ${subject.id === activeSubject ? "is-active" : ""}`} onClick={() => openSubject(subject.id)} key={subject.id} aria-pressed={subject.id === activeSubject}>
              <span className="subject-code">{subject.code}</span>
              <div><small>Semester 7</small><strong>{subject.title}</strong><p>{subject.description}</p></div>
              <footer><span>{subject.coverage}</span><b>{subject.id === activeSubject ? "Viewing" : "Open"} →</b></footer>
            </button>
          ))}
        </div>
      </section>

      <section id="subject-curriculum" className="subject-curriculum" aria-labelledby="subject-curriculum-title">
        <header className="subject-heading">
          <span className={`subject-icon subject-icon--${selectedSubject.color}`}>{selectedSubject.code}</span>
          <div><span className="eyebrow">Selected clinical subject</span><h2 id="subject-curriculum-title">{selectedSubject.title}</h2><p>{selectedSubject.description}</p></div>
          <span>{selectedSubject.coverage}</span>
        </header>
        <div className="curriculum-grid">
          {selectedSubject.areas.map((area) => {
            const isCardiovascular = area.code === "CV";
            return (
              <article className="curriculum-card" key={area.code}>
                <header><span className={`system-icon system-icon--${area.color}`}>{area.code}</span><span className={`area-state area-state--${area.state}`}>{area.state === "live" ? "Lessons live" : area.state === "mapped" ? "Source mapped" : "Curriculum planned"}</span></header>
                <h3>{area.title}</h3><p>{area.description}</p>
                <div className="topic-pills">{area.topics.map((topic) => <span className={isCardiovascular ? "is-ready" : ""} key={topic}>{topic}</span>)}</div>
                {isCardiovascular ? <div className={`system-progress system-progress--${area.color}`}><i style={{ width: `${outputComplete ? 68 : cardiacComplete ? 65 : 62}%` }} /></div> : <div className="curriculum-placeholder"><i /><span>Lessons will be added in foundation-first order</span></div>}
                <footer><span><small>{isCardiovascular ? "Continue learning" : "Current status"}</small><strong>{isCardiovascular ? currentTitle : area.state === "mapped" ? "Alignment prepared" : "Syllabus grouped"}</strong></span>{isCardiovascular ? <a href={currentHref} aria-label={`Open ${area.title}`}>→</a> : <span className="curriculum-lock" aria-label="Lessons planned">⌁</span>}</footer>
              </article>
            );
          })}
        </div>
      </section>

      {activeSubject === "internal-medicine" ? <section className="current-route" aria-labelledby="route-title">
        <header className="section-header"><div><span className="eyebrow">Internal Medicine · Recommended sequence</span><h2 id="route-title">Cardiovascular route</h2></div><span>{cardiacComplete ? "4" : "3"} foundations complete · {outputComplete ? "Blood pressure planned" : `${currentTitle} next`}</span></header>
        <div className="route-track" role="list" aria-label="Cardiovascular foundation sequence">
          {routeItems.map((item, index) => (
            <div className={`${item.complete ? "is-complete" : ""} ${item.current ? "is-current" : ""}`} role="listitem" key={item.label}>
              <span>{item.complete ? "✓" : index + 1}</span><strong>{item.label}</strong><small>{item.complete ? "Complete" : item.current ? "Continue now" : "Locked in sequence"}</small>
              {item.href ? <a href={item.href}>{item.complete ? "Review" : "Open lesson"} →</a> : null}
            </div>
          ))}
        </div>
      </section> : <section className="subject-next-step"><span aria-hidden="true">⌁</span><div><strong>{selectedSubject.shortTitle} is now visible as its own learning subject.</strong><p>Its clinical areas are grouped from the syllabus. Detailed source alignment and Professor Mode lessons will be added area by area.</p></div><a href="/library">Review sources</a></section>}

      <section className="coming-next source-map-promo"><span aria-hidden="true">⌁</span><div><strong>The current source map covers 30 Internal Medicine topic groups.</strong><p>Perioperative Medicine and Women & Child Health now have their own learning homes and can receive separate source maps next.</p></div><a href="/alignment">Open source map</a></section>

      <section id="coming-next" className="coming-next"><span aria-hidden="true">✦</span><div><strong>Subject first. System second. Lesson third.</strong><p>{outputComplete ? "Cardiac output is complete. Blood pressure is the next planned Internal Medicine foundation." : `${currentTitle} remains your active lesson inside Internal Medicine.`}</p></div><a href={currentHref}>{outputComplete ? "Review lesson" : "Continue lesson"}</a></section>
    </div>
  );
}
