"use client";

import { useEffect, useMemo, useState } from "react";

const lessonSlug = "cardiac-cycle";

const lessonSteps = [
  { stage: "Orient", title: "See one complete loop", cue: "A heartbeat is not four separate events. It is one pressure-driven loop.", detail: "Follow the left ventricle through filling, contraction, ejection and relaxation. The right side performs the same sequence at lower pressures.", connect: "Pressure differences decide whether each valve opens or closes." },
  { stage: "Fill", title: "Ventricular filling", cue: "Blood moves down a pressure gradient from atrium to ventricle.", detail: "During diastole, ventricular pressure is lower than atrial pressure. The AV valves are open, so most filling is passive. Atrial contraction adds the final portion.", connect: "Reduced ventricular compliance makes this final atrial contribution more important." },
  { stage: "Close", title: "AV valves close — S1", cue: "The ventricle begins to contract, but no blood leaves yet.", detail: "When ventricular pressure rises above atrial pressure, the mitral and tricuspid valves close. All valves are briefly closed while pressure rises: isovolumetric contraction.", connect: "AV-valve closure produces the first heart sound, S1." },
  { stage: "Open", title: "Outflow valves open", cue: "Pressure has built enough to overcome the artery ahead.", detail: "When ventricular pressure exceeds aortic or pulmonary arterial pressure, the semilunar valves open. Ventricular volume now begins to fall.", connect: "The pressure threshold is higher on the left because systemic resistance is higher." },
  { stage: "Eject", title: "Ventricular ejection", cue: "Pressure becomes forward flow.", detail: "Blood leaves rapidly at first, then more slowly as contraction wanes. The blood remaining after ejection is the end-systolic volume.", connect: "Stroke volume equals end-diastolic volume minus end-systolic volume." },
  { stage: "Close", title: "Semilunar valves close — S2", cue: "The arteries briefly become the higher-pressure chamber.", detail: "As ventricular pressure falls below arterial pressure, the aortic and pulmonary valves close. All valves are again closed during isovolumetric relaxation.", connect: "Semilunar-valve closure produces the second heart sound, S2." },
  { stage: "Reset", title: "Relax and refill", cue: "The loop resets when ventricular pressure falls below atrial pressure.", detail: "The AV valves open, rapid filling begins, and a new cycle starts. Volume changes only while an inlet or outlet valve is open.", connect: "This repeating relationship lets you predict valve state from pressure alone." },
];

const recallQuestions = [
  { q: "What closes the AV valves?", a: "Ventricular pressure rising above atrial pressure." },
  { q: "Why is contraction called isovolumetric at first?", a: "All valves are closed, so pressure rises while ventricular volume stays constant." },
  { q: "What event produces S2?", a: "Closure of the aortic and pulmonary valves as ventricular pressure falls below arterial pressure." },
];

export function LessonWorkspace() {
  const [activeStep, setActiveStep] = useState(0);
  const [completedPoints, setCompletedPoints] = useState(0);
  const [notes, setNotes] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [revealed, setRevealed] = useState<number[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/notes?lesson=${lessonSlug}`).then((response) => response.ok ? response.json() : null),
      fetch("/api/progress").then((response) => response.ok ? response.json() : null),
    ]).then(([notesData, progressData]) => {
      if (!active) return;
      if (notesData?.note?.content) setNotes(notesData.note.content);
      const saved = progressData?.progress?.find((row: { lessonSlug: string }) => row.lessonSlug === lessonSlug);
      if (saved) {
        setCompletedPoints(saved.completedPoints);
        setActiveStep(Math.min(saved.completedPoints, lessonSteps.length - 1));
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const progressPercent = Math.round((completedPoints / lessonSteps.length) * 100);
  const step = lessonSteps[activeStep];
  const nextLabel = activeStep === lessonSteps.length - 1 ? "Finish foundation" : "Teach next point";
  const complete = completedPoints >= lessonSteps.length;

  async function persistProgress(points: number) {
    setCompletedPoints(points);
    await fetch("/api/progress", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonSlug, completedPoints: points, totalPoints: lessonSteps.length, status: points >= lessonSteps.length ? "complete" : "in_progress" }),
    }).catch(() => undefined);
  }

  async function advance() {
    const nextPoints = Math.max(completedPoints, Math.min(activeStep + 1, lessonSteps.length));
    await persistProgress(nextPoints);
    if (activeStep < lessonSteps.length - 1) setActiveStep((current) => current + 1);
  }

  async function saveNotes() {
    setSaveState("saving");
    try {
      const response = await fetch("/api/notes", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonSlug, content: notes }) });
      setSaveState(response.ok ? "saved" : "error");
    } catch { setSaveState("error"); }
  }

  const mapProgress = useMemo(() => Math.max(completedPoints, activeStep), [activeStep, completedPoints]);

  return (
    <div className="lesson-page">
      <header className="lesson-heading">
        <div><a href="/learn">← Clinical foundations</a><span className="eyebrow">Professor Mode · Foundation lesson</span><h1>The cardiac cycle</h1><p>Use pressure to predict every valve movement, volume change, and heart sound.</p></div>
        <div className="lesson-progress-card"><span><strong>{progressPercent}%</strong><small>lesson complete</small></span><div><i style={{ width: `${progressPercent}%` }} /></div><b>{complete ? "Foundation complete" : `${lessonSteps.length - completedPoints} points remaining`}</b></div>
      </header>

      <section className="source-status"><span aria-hidden="true">⌁</span><div><strong>Professor explanation</strong><p>This foundation lesson is clearly separated from uploaded sources. Add a textbook or syllabus in Library to prepare future source-linked lessons.</p></div><a href="/library">Attach source →</a></section>

      <section className="mind-map" aria-labelledby="mind-map-title">
        <header><div><span className="eyebrow">Sideways concept map</span><h2 id="mind-map-title">One heartbeat, left to right</h2></div><small>Choose any node to revisit it</small></header>
        <div className="mind-map-track" role="list">
          {lessonSteps.map((item, index) => (
            <button className={`${index === activeStep ? "is-active" : ""} ${index < mapProgress ? "is-complete" : ""}`} type="button" key={`${item.stage}-${index}`} onClick={() => setActiveStep(index)}>
              <span>{index < completedPoints ? "✓" : index + 1}</span><b>{item.stage}</b><small>{item.title}</small>{index < lessonSteps.length - 1 ? <i aria-hidden="true">→</i> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="lesson-grid">
        <article className="professor-card">
          <header><div className="professor-avatar"><span>Prof.</span><b>V</b></div><div><span className="eyebrow">Point {activeStep + 1} of {lessonSteps.length}</span><h2>{step.title}</h2></div><span className="teaching-live"><i /> Teaching now</span></header>
          <div className="professor-cue"><span>Start here</span><blockquote>{step.cue}</blockquote></div>
          <div className="professor-detail"><span className="detail-number">{String(activeStep + 1).padStart(2, "0")}</span><div><h3>Walk through it</h3><p>{step.detail}</p><aside><span aria-hidden="true">↗</span><p><strong>Clinical connection</strong>{step.connect}</p></aside></div></div>
          <footer><button className="lesson-back" type="button" disabled={activeStep === 0} onClick={() => setActiveStep((current) => Math.max(0, current - 1))}>← Previous</button><button className="lesson-next" type="button" onClick={advance}>{nextLabel}<span>→</span></button></footer>
        </article>

        <aside className="notes-card">
          <header><div><span className="eyebrow">Your notebook</span><h2>Make it yours</h2></div><span className={`save-state save-state--${saveState}`}>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Try again" : "Private"}</span></header>
          <p>Write the idea in your own words. Your notes are saved privately to this lesson.</p>
          <label htmlFor="lesson-notes">My cardiac-cycle notes</label>
          <textarea id="lesson-notes" value={notes} onChange={(event) => { setNotes(event.target.value); setSaveState("idle"); }} placeholder={'Pressure drives valve movement.\n\nDuring filling...\n\nWhat I still need to clarify...'} />
          <button type="button" onClick={saveNotes} disabled={saveState === "saving"}>Save notes <span>✓</span></button>
          <small>{notes.length.toLocaleString()} / 30,000 characters</small>
        </aside>
      </section>

      <section id="recall" className="recall-section">
        <header className="section-header"><div><span className="eyebrow">Close the notes</span><h2>Active recall checkpoint</h2></div><span>{revealed.length} of {recallQuestions.length} revealed</span></header>
        <div className="recall-grid">{recallQuestions.map((item, index) => {
          const isRevealed = revealed.includes(index);
          return <button type="button" className={isRevealed ? "is-revealed" : ""} key={item.q} onClick={() => setRevealed((current) => isRevealed ? current.filter((value) => value !== index) : [...current, index])}><span>Question {index + 1}</span><strong>{item.q}</strong><p>{isRevealed ? item.a : "Answer aloud, then reveal"}</p><b>{isRevealed ? "Hide answer" : "Reveal answer"} →</b></button>;
        })}</div>
      </section>
    </div>
  );
}
