"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type SystemKey = "Cardiovascular" | "Respiratory" | "Renal";
type StatusKey = "strong" | "partial" | "review" | "missing";

type AlignmentRow = {
  id: string;
  system: SystemKey;
  week: string;
  number: string;
  topic: string;
  primary: string;
  pages: string;
  support: string;
  status: StatusKey;
  note: string;
};

type ReviewDecision = "pending" | "approved" | "changes_requested";
type AlignmentReview = { alignmentId: string; decision: ReviewDecision; reviewerNote: string; updatedAt: string };
type ImportedAlignment = {
  id: string; batchTitle: string; system: string; week: string; topic: string; primarySource: string;
  pageReference: string; supportSource: string; status: string; note: string; createdAt: string;
};

const statusLabels: Record<StatusKey, string> = {
  strong: "Strong match",
  partial: "Partial match",
  review: "Needs review",
  missing: "No direct source",
};

const sources = [
  {
    short: "HPIM 21e",
    title: "Harrison’s Principles of Internal Medicine",
    detail: "21st edition · Loscalzo et al. · 2022",
    role: "Primary available source",
    status: "Edition check",
    tone: "primary",
  },
  {
    short: "Bates 12e",
    title: "Bates’ Guide to Physical Examination",
    detail: "12th edition · Bickley & Szilagyi · 2017",
    role: "Examination source",
    status: "Edition check",
    tone: "exam",
  },
  {
    short: "HCM 2e",
    title: "Harrison’s Cardiovascular Medicine",
    detail: "2nd edition · Joseph Loscalzo · 2013",
    role: "Cardiology cross-reference",
    status: "Older edition",
    tone: "cardio",
  },
  {
    short: "BHD 12e",
    title: "Braunwald’s Heart Disease",
    detail: "12th edition · Libby et al. · 2022",
    role: "Advanced cardiology detail",
    status: "Newer edition",
    tone: "depth",
  },
];

const foundations = [
  ["01", "Heart structure & flow", "HCM 2e · Ch. 1", "PDF p.15"],
  ["02", "Normal conduction", "HPIM 21e · Ch. 243", "PDF p.1907"],
  ["03", "Cardiac cycle", "Braunwald 12e · Ch. 46", "PDF p.1258"],
  ["04", "Cardiac output", "HPIM 21e · Ch. 237", "PDF p.1840"],
  ["05", "Blood pressure", "HPIM 21e · Ch. 277", "PDF p.2113"],
  ["06", "Normal examination", "Bates 12e · Ch. 9", "PDF p.373"],
  ["07", "ECG after conduction", "HPIM 21e · Ch. 240", "PDF p.1865"],
];

const alignments: AlignmentRow[] = [
  {
    id: "cv-1-1", system: "Cardiovascular", week: "I", number: "1",
    topic: "Approach to the patient, cardiovascular examination and ECG",
    primary: "HPIM 21e · Chs. 236, 239–240", pages: "PDF pp.1838, 1856, 1865",
    support: "Bates 12e · Ch. 9; HCM 2e · Chs. 3, 9, 11", status: "strong",
    note: "The topic match is direct. Bates and HCM editions differ from the weekly syllabus references.",
  },
  {
    id: "cv-1-2", system: "Cardiovascular", week: "I", number: "2",
    topic: "Echo, nuclear cardiology, MRI/CT, catheterization and angiography",
    primary: "HPIM 21e · Chs. 241–242", pages: "PDF pp.1873, 1900",
    support: "HCM 2e · Chs. 12–13; Braunwald 12e · Chs. 16, 18–22", status: "strong",
    note: "Split this into non-invasive imaging and invasive investigation lessons.",
  },
  {
    id: "cv-1-3", system: "Cardiovascular", week: "I", number: "3",
    topic: "Electrophysiology, bradyarrhythmias and tachyarrhythmias",
    primary: "HPIM 21e · Chs. 243–256", pages: "PDF pp.1907–1968",
    support: "HCM 2e · Chs. 14–16", status: "strong",
    note: "Learn the normal conduction pathway first, then separate brady-, supraventricular and ventricular rhythm disorders.",
  },
  {
    id: "cv-1-4", system: "Cardiovascular", week: "I", number: "4",
    topic: "Normal myocardial function, heart failure and pulmonary hypertension",
    primary: "HPIM 21e · Chs. 237, 257–258, 283", pages: "PDF pp.1840, 1971, 1981, 2162",
    support: "HCM 2e · Chs. 17, 40; Braunwald 12e · Chs. 46–51, 88", status: "strong",
    note: "Normal contraction and cardiac output should come before the heart-failure chapters.",
  },
  {
    id: "cv-2-5", system: "Cardiovascular", week: "II", number: "5",
    topic: "Heart transplantation and congenital heart disease in adults",
    primary: "HPIM 21e · Chs. 260, 269", pages: "PDF pp.2014, 2049",
    support: "HCM 2e · Chs. 18–19; Braunwald 12e · Chs. 60, 82", status: "strong",
    note: "Two distinct lessons are recommended even though they share one syllabus item.",
  },
  {
    id: "cv-2-6", system: "Cardiovascular", week: "II", number: "6",
    topic: "Valvular diseases of the heart",
    primary: "HPIM 21e · Chs. 261–268", pages: "PDF pp.2019–2046",
    support: "HCM 2e · Ch. 20; Braunwald 12e · Chs. 72–81", status: "strong",
    note: "Divide by valve, then by stenosis and regurgitation so the hemodynamics stay connected.",
  },
  {
    id: "cv-2-7", system: "Cardiovascular", week: "II", number: "7",
    topic: "Cardiomyopathy, myocarditis, infective endocarditis and pericardial disease",
    primary: "HPIM 21e · Chs. 259, 128, 270", pages: "PDF pp.1995, 1063, 2060",
    support: "HCM 2e · Chs. 21–22, 25; Braunwald 12e · Chs. 52, 54–55, 80, 86", status: "strong",
    note: "These conditions need separate lessons; the grouping only preserves the syllabus numbering.",
  },
  {
    id: "cv-2-8", system: "Cardiovascular", week: "II", number: "8",
    topic: "Cardiac tumors, systemic disease manifestations and cardiac trauma",
    primary: "HPIM 21e · Chs. 271–272", pages: "PDF pp.2066, 2069",
    support: "HCM 2e · Chs. 23–24; Braunwald 12e · Ch. 98", status: "review",
    note: "Systemic manifestations are distributed across HPIM disease chapters. The direct HCM chapter is from an older edition.",
  },
  {
    id: "cv-3-9", system: "Cardiovascular", week: "III", number: "9",
    topic: "Atherosclerosis pathogenesis and ischemic heart disease",
    primary: "HPIM 21e · Ch. 273", pages: "PDF p.2071",
    support: "Braunwald 12e · Chs. 24, 36, 40; HCM 2e · Chs. 30, 33", status: "strong",
    note: "Begin with vascular biology, then move to coronary blood flow and stable ischemic disease.",
  },
  {
    id: "cv-3-10", system: "Cardiovascular", week: "III", number: "10",
    topic: "Unstable angina, NSTEMI and STEMI",
    primary: "HPIM 21e · Chs. 274–275", pages: "PDF pp.2087, 2094",
    support: "HCM 2e · Chs. 34–35; Braunwald 12e · Chs. 37–39", status: "strong",
    note: "Learn acute coronary syndrome recognition before management pathways.",
  },
  {
    id: "cv-3-11", system: "Cardiovascular", week: "III", number: "11",
    topic: "PCI and hypertensive vascular disease",
    primary: "HPIM 21e · Chs. 276–277", pages: "PDF pp.2107, 2113",
    support: "HCM 2e · Chs. 36–37; Braunwald 12e · Chs. 26, 41", status: "strong",
    note: "Keep PCI and hypertension as separate learning units.",
  },
  {
    id: "cv-3-12", system: "Cardiovascular", week: "III", number: "12",
    topic: "Aortic diseases and vascular disease of the extremities",
    primary: "HPIM 21e · Chs. 280–281", pages: "PDF pp.2142, 2148",
    support: "HCM 2e · Chs. 38–39; Braunwald 12e · Chs. 42–44", status: "strong",
    note: "Aortic emergencies and chronic peripheral arterial disease should be taught separately.",
  },
  {
    id: "rs-4-1", system: "Respiratory", week: "IV", number: "1",
    topic: "Approach to dyspnea, cough and hemoptysis",
    primary: "HPIM 21e · Chs. 37–39, 284–286", pages: "PDF pp.304, 308, 311, 2172–2181",
    support: "Symptom chapters first; respiratory evaluation second", status: "strong",
    note: "This preserves a clinical sequence from presenting symptom to focused investigation.",
  },
  {
    id: "rs-4-2", system: "Respiratory", week: "IV", number: "2",
    topic: "Asthma",
    primary: "HPIM 21e · Ch. 287", pages: "PDF p.2188",
    support: "Direct chapter match", status: "strong",
    note: "Cover mechanism, diagnosis, severity and treatment in the syllabus order.",
  },
  {
    id: "rs-4-3", system: "Respiratory", week: "IV", number: "3",
    topic: "COPD and emphysema",
    primary: "HPIM 21e · Ch. 292", pages: "PDF p.2221",
    support: "Direct chapter match", status: "strong",
    note: "Start with airflow limitation and risk factors before treatment.",
  },
  {
    id: "rs-4-4", system: "Respiratory", week: "IV", number: "4",
    topic: "Acute bronchitis",
    primary: "No dedicated chapter located", pages: "—",
    support: "Lecturer material or another approved clinical source required", status: "missing",
    note: "Do not infer this topic from the pneumonia chapter. A direct source needs to be added.",
  },
  {
    id: "rs-4-5", system: "Respiratory", week: "IV", number: "5",
    topic: "Pneumonia",
    primary: "HPIM 21e · Ch. 126", pages: "PDF p.1050",
    support: "Direct chapter match", status: "strong",
    note: "Keep community-acquired pneumonia source-locked before adding other pneumonia categories.",
  },
  {
    id: "rs-4-6", system: "Respiratory", week: "IV", number: "6",
    topic: "Lung abscess and bronchiectasis",
    primary: "HPIM 21e · Chs. 127, 290", pages: "PDF pp.1061, 2214",
    support: "Two direct chapter matches", status: "strong",
    note: "Teach these as two lessons connected by chronic infection and airway clearance.",
  },
  {
    id: "rs-5-7", system: "Respiratory", week: "V", number: "7",
    topic: "Pulmonary tuberculosis",
    primary: "HPIM 21e · Ch. 178", pages: "PDF p.1398",
    support: "Direct chapter match", status: "strong",
    note: "Use the pulmonary sections first; extrapulmonary disease can follow as an extension.",
  },
  {
    id: "rs-5-8", system: "Respiratory", week: "V", number: "8",
    topic: "Granulomatosis with polyangiitis and related granulomatous disease",
    primary: "HPIM 21e · Ch. 363", pages: "PDF p.2843",
    support: "The Vasculitis Syndromes", status: "partial",
    note: "Confirm the lecturer’s intended list because the syllabus uses the broad term “granulomatoses.”",
  },
  {
    id: "rs-5-9", system: "Respiratory", week: "V", number: "9",
    topic: "Occupational/environmental disease, sarcoidosis and cystic fibrosis",
    primary: "HPIM 21e · Chs. 289, 367, 291", pages: "PDF pp.2207, 2870, 2217",
    support: "Three separate direct chapters", status: "review",
    note: "The syllabus groups unrelated diseases together. Vitae separates them into occupational disease, sarcoidosis and cystic fibrosis lessons.",
  },
  {
    id: "rs-5-10", system: "Respiratory", week: "V", number: "10",
    topic: "Idiopathic fibrotic/interstitial lung disease",
    primary: "HPIM 21e · Ch. 293", pages: "PDF p.2231",
    support: "Direct chapter match", status: "strong",
    note: "Begin with interstitial patterns before individual causes.",
  },
  {
    id: "rs-5-11", system: "Respiratory", week: "V", number: "11",
    topic: "ARDS and lung neoplasms",
    primary: "HPIM 21e · Chs. 301, 78", pages: "PDF pp.2266, 635",
    support: "Two direct chapter matches", status: "strong",
    note: "These must remain separate lessons despite sharing one syllabus number.",
  },
  {
    id: "rs-5-12", system: "Respiratory", week: "V", number: "12",
    topic: "Pleural disease, pneumothorax and pulmonary embolism",
    primary: "HPIM 21e · Chs. 294, 279", pages: "PDF pp.2238, 2132",
    support: "Pleural disease plus thromboembolism chapters", status: "strong",
    note: "Teach pleural mechanics before pneumothorax, then pulmonary embolism as a distinct vascular emergency.",
  },
  {
    id: "rn-6-1", system: "Renal", week: "VI", number: "1",
    topic: "Renal anatomy, physiology and physical examination",
    primary: "HPIM 21e · Chs. 308–309", pages: "PDF pp.2320, 2328",
    support: "Bates 12e · Ch. 11 · PDF p.479", status: "partial",
    note: "Physiology and clinical approach are strong; a dedicated anatomy source would improve structural detail.",
  },
  {
    id: "rn-6-2", system: "Renal", week: "VI", number: "2",
    topic: "UTI, nephrolithiasis, obstruction and polycystic kidney disease",
    primary: "HPIM 21e · Chs. 135, 315, 318–319", pages: "PDF pp.1111, 2391, 2409, 2414",
    support: "Four direct chapter matches", status: "strong",
    note: "Use separate lessons; the source map retains the single syllabus grouping.",
  },
  {
    id: "rn-6-3", system: "Renal", week: "VI", number: "3",
    topic: "Primary glomerulopathies",
    primary: "HPIM 21e · Ch. 314", pages: "PDF p.2372",
    support: "Minimal change, FSGS, membranous, IgA and MPGN", status: "strong",
    note: "Learn nephritic and nephrotic patterns before the individual diseases.",
  },
  {
    id: "rn-7-4", system: "Renal", week: "VII", number: "4",
    topic: "Secondary glomerulopathies: diabetes, SLE, amyloidosis and gout",
    primary: "HPIM 21e · Ch. 314 + disease chapters", pages: "PDF pp.2372, 3161, 2777, 919, 2903",
    support: "Chs. 405, 356, 112, 372", status: "partial",
    note: "Confirm whether “gout” means urate nephropathy, nephrolithiasis or general gout.",
  },
  {
    id: "rn-7-5", system: "Renal", week: "VII", number: "5",
    topic: "Acute kidney injury",
    primary: "HPIM 21e · Ch. 310", pages: "PDF p.2337",
    support: "Prerenal, intrinsic renal and postrenal framework", status: "strong",
    note: "The chapter maps directly to the syllabus classification.",
  },
  {
    id: "rn-7-6", system: "Renal", week: "VII", number: "6",
    topic: "CKD, renal replacement therapy and transplantation",
    primary: "HPIM 21e · Chs. 311–313", pages: "PDF pp.2350, 2361, 2366",
    support: "Three direct chapter matches", status: "strong",
    note: "Move from CKD staging and complications to dialysis, then transplantation.",
  },
];

export function AlignmentWorkspace() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [system, setSystem] = useState<"All" | SystemKey>("All");
  const [status, setStatus] = useState<"all" | StatusKey>("all");
  const [query, setQuery] = useState("");
  const [reviews, setReviews] = useState<Record<string, AlignmentReview>>({});
  const [imported, setImported] = useState<ImportedAlignment[]>([]);
  const [reviewSaving, setReviewSaving] = useState("");
  const [importTitle, setImportTitle] = useState("Internal Medicine alignment");
  const [importText, setImportText] = useState("");
  const [importState, setImportState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/alignments").then((response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !data) return;
      setImported(data.imported ?? []);
      setReviews(Object.fromEntries((data.reviews ?? []).map((review: AlignmentReview) => [review.alignmentId, review])));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return alignments.filter((item) => {
      const matchesSystem = system === "All" || item.system === system;
      const matchesStatus = status === "all" || item.status === status;
      const matchesQuery = !normalized || `${item.topic} ${item.primary} ${item.support}`.toLowerCase().includes(normalized);
      return matchesSystem && matchesStatus && matchesQuery;
    });
  }, [query, status, system]);

  const statusCounts = useMemo(() => alignments.reduce<Record<StatusKey, number>>((counts, item) => {
    counts[item.status] += 1;
    return counts;
  }, { strong: 0, partial: 0, review: 0, missing: 0 }), []);

  const approvedCount = Object.values(reviews).filter((review) => review.decision === "approved").length;

  async function saveReview(alignmentId: string, decision: ReviewDecision) {
    setReviewSaving(alignmentId);
    try {
      const response = await fetch("/api/alignments", {
        method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ alignmentId, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Review could not be saved.");
      setReviews((current) => ({ ...current, [alignmentId]: data.review }));
    } catch {
      setImportState("error"); setImportMessage("The review decision could not be saved. Please try again.");
    } finally { setReviewSaving(""); }
  }

  async function importAlignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importText.trim()) { setImportState("error"); setImportMessage("Paste a table or choose a CSV, TSV, or text file."); return; }
    setImportState("saving"); setImportMessage("Checking and saving the alignment rows…");
    try {
      const response = await fetch("/api/alignments", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: importTitle, text: importText }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import failed.");
      setImported((current) => [...data.imported, ...current]);
      setImportText(""); if (fileRef.current) fileRef.current.value = "";
      setImportState("success"); setImportMessage(`${data.imported.length} alignment ${data.imported.length === 1 ? "row" : "rows"} saved as review drafts.`);
    } catch (error) {
      setImportState("error"); setImportMessage(error instanceof Error ? error.message : "The alignment table could not be imported.");
    }
  }

  async function readImportFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setImportState("error"); setImportMessage("Use a CSV, TSV, or text alignment file under 2 MB."); return; }
    setImportText(await file.text());
    setImportTitle(file.name.replace(/\.(csv|tsv|txt)$/i, "").slice(0, 120) || "Imported alignment");
    setImportState("idle"); setImportMessage("");
  }

  function reviewControls(alignmentId: string) {
    const decision = reviews[alignmentId]?.decision ?? "pending";
    return <div className="review-controls" aria-label="Review this alignment">
      <span className={`review-decision review-decision--${decision}`}>{decision === "approved" ? "Approved" : decision === "changes_requested" ? "Needs changes" : "Awaiting review"}</span>
      <button className={decision === "approved" ? "is-selected" : ""} type="button" disabled={reviewSaving === alignmentId} onClick={() => saveReview(alignmentId, "approved")}>✓ Approve</button>
      <button className={decision === "changes_requested" ? "is-selected is-change" : ""} type="button" disabled={reviewSaving === alignmentId} onClick={() => saveReview(alignmentId, "changes_requested")}>Flag change</button>
    </div>;
  }

  return (
    <div className="alignment-page">
      <header className="alignment-hero">
        <div>
          <span className="eyebrow"><i /> Syllabus → books → lessons</span>
          <h1>Every topic now has<br />a source path.</h1>
          <p>The Internal Medicine syllabus has been checked against the books currently available. Start with the recommended chapter, see the exact PDF location, and notice where human confirmation is still needed.</p>
          <div className="alignment-hero-actions">
            <a className="primary-button primary-button--dark" href="#alignment-table">Explore chapter map <span>↓</span></a>
            <a href="/library">Open source library</a>
          </div>
        </div>
        <div className="alignment-scorecard" aria-label="Alignment summary">
          <span>Alignment prepared</span>
          <strong>{alignments.length + imported.length}<small>mapped + imported groups</small></strong>
          <div>
            <span><i className="status-dot status-dot--strong" /><b>{statusCounts.strong}</b><small>strong</small></span>
            <span><i className="status-dot status-dot--partial" /><b>{statusCounts.partial}</b><small>partial</small></span>
            <span><i className="status-dot status-dot--review" /><b>{statusCounts.review}</b><small>review</small></span>
            <span><i className="status-dot status-dot--missing" /><b>{statusCounts.missing}</b><small>missing</small></span>
          </div>
        </div>
      </header>

      <section className="alignment-steps alignment-steps--six" aria-label="ChatGPT to Vitae source workflow">
        <article className="is-complete"><span>1</span><div><strong>Syllabus reviewed</strong><small>Objectives, weeks and literature</small></div><b>✓</b></article>
        <article className="is-complete"><span>2</span><div><strong>Books identified</strong><small>Titles, authors and editions</small></div><b>✓</b></article>
        <article className="is-complete"><span>3</span><div><strong>Chapters aligned</strong><small>Verified PDF start pages</small></div><b>✓</b></article>
        <article className={approvedCount ? "is-complete" : "is-next"}><span>4</span><div><strong>Review & approve</strong><small>{approvedCount} decisions approved</small></div><b>{approvedCount ? "✓" : "Now"}</b></article>
        <article><span>5</span><div><strong>Upload source bundle</strong><small>Syllabus, contents and book sections</small></div><a href="/library">Open</a></article>
        <article className={imported.length ? "is-complete" : "is-next"}><span>6</span><div><strong>Import alignment</strong><small>Paste a table or choose a file</small></div><a href="#alignment-import">{imported.length ? "✓" : "Open"}</a></article>
      </section>

      <aside className="identity-warning" aria-labelledby="identity-warning-title">
        <span aria-hidden="true">!</span>
        <div><strong id="identity-warning-title">Course identity needs confirmation</strong><p>The filename says “Internal medicine 1,” the document title says “Internal Medicine IV,” its objective mentions seventh-semester students, and the semester grid appears to mark Semester IX. The clinical topic map remains usable, but Vitae will not silently assign the wrong official semester.</p></div>
        <span>Needs review</span>
      </aside>

      <section id="alignment-import" className="alignment-import" aria-labelledby="alignment-import-title">
        <div className="import-copy"><span className="eyebrow">Step 6 · Bring in a ChatGPT plan</span><h2 id="alignment-import-title">Paste or import an alignment table.</h2><p>Use CSV, TSV, plain text, or a Markdown table. Vitae stores every imported row as a draft until you approve it.</p><div><strong>Required columns</strong><span>Topic</span><span>Primary source or chapter</span><small>Optional: system, week, pages, support, status, note</small></div></div>
        <form onSubmit={importAlignment}>
          <label><span>Alignment name</span><input value={importTitle} onChange={(event) => setImportTitle(event.target.value)} maxLength={120} /></label>
          <label className="import-file"><span>Choose CSV, TSV, or text</span><input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={(event) => readImportFile(event.target.files?.[0])} /></label>
          <label><span>Or paste the table</span><textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={"System | Week | Topic | Primary source | Pages | Status | Note\nCardiovascular | I | Heart failure | HPIM 21e Ch. 257 | PDF p.1971 | Strong match | Verify edition"} /></label>
          {importMessage ? <p className={`import-message import-message--${importState}`} role="status">{importMessage}</p> : null}
          <button type="submit" disabled={importState === "saving"}>{importState === "saving" ? "Importing…" : "Import as review drafts"}<span>→</span></button>
        </form>
      </section>

      {imported.length ? <section className="imported-alignments" aria-labelledby="imported-alignments-title">
        <header className="section-header"><div><span className="eyebrow">Imported drafts</span><h2 id="imported-alignments-title">Your imported alignment rows</h2></div><span>{imported.length} awaiting or reviewed</span></header>
        <div className="alignment-list">
          {imported.map((item) => <article className="alignment-row" key={item.id}>
            <div className="alignment-week"><span>{item.system}</span><strong>{item.week ? `Week ${item.week}` : "Imported"}</strong><small>{item.batchTitle}</small></div>
            <div className="alignment-topic"><span className="alignment-status alignment-status--review"><i />{item.status.replaceAll("_", " ")}</span><h3>{item.topic}</h3><p>{item.note || "Imported from your alignment plan. Review before use."}</p></div>
            <div className="alignment-source"><span>Proposed source</span><strong>{item.primarySource}</strong><small>{item.pageReference || "Page not supplied"}</small></div>
            <div className="alignment-support"><span>Support / review</span><p>{item.supportSource || "No supporting source supplied."}</p>{reviewControls(item.id)}</div>
          </article>)}
        </div>
      </section> : null}

      <section className="source-inventory" aria-labelledby="source-inventory-title">
        <header className="section-header"><div><span className="eyebrow">Available textbook set</span><h2 id="source-inventory-title">Sources used for this map</h2></div><a href="/library">Manage sources →</a></header>
        <div className="source-inventory-grid">
          {sources.map((source) => (
            <article key={source.short}>
              <span className={`source-book source-book--${source.tone}`}>{source.short}</span>
              <div><strong>{source.title}</strong><p>{source.detail}</p><small>{source.role}</small></div>
              <b>{source.status}</b>
            </article>
          ))}
        </div>
        <p className="edition-note"><span aria-hidden="true">⌁</span><strong>Edition rule:</strong> the syllabus weekly table requests HCM 3e, HPIM 20e and Bates 11e. Your available editions differ, so the map uses the best available chapter match and keeps an edition-check label visible.</p>
      </section>

      <section className="foundation-map" aria-labelledby="foundation-map-title">
        <header className="section-header"><div><span className="eyebrow">Before clinical cardiology</span><h2 id="foundation-map-title">Foundation-first source bridge</h2></div><span>Follow left to right</span></header>
        <div className="foundation-track">
          {foundations.map(([number, topic, chapter, page], index) => (
            <article key={number}>
              <span>{number}</span><strong>{topic}</strong><p>{chapter}</p><small>{page}</small>{index < foundations.length - 1 ? <i aria-hidden="true">→</i> : null}
            </article>
          ))}
        </div>
      </section>

      <section id="alignment-table" className="alignment-table" aria-labelledby="alignment-table-title">
        <header className="section-header"><div><span className="eyebrow">Syllabus coverage</span><h2 id="alignment-table-title">Topic-to-chapter map</h2></div><span>{filtered.length} of {alignments.length} shown</span></header>
        <div className="alignment-toolbar">
          <div className="system-tabs" role="group" aria-label="Filter by clinical system">
            {(["All", "Cardiovascular", "Respiratory", "Renal"] as const).map((item) => <button className={system === item ? "is-active" : ""} type="button" onClick={() => setSystem(item)} key={item}>{item}</button>)}
          </div>
          <label className="alignment-search"><span aria-hidden="true">⌕</span><span className="sr-only">Search topics or chapters</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics or chapters" /></label>
          <label className="status-filter"><span className="sr-only">Filter by alignment status</span><select value={status} onChange={(event) => setStatus(event.target.value as "all" | StatusKey)}><option value="all">All statuses</option><option value="strong">Strong match</option><option value="partial">Partial match</option><option value="review">Needs review</option><option value="missing">No direct source</option></select></label>
        </div>

        <div className="alignment-list" aria-live="polite">
          {filtered.map((item) => (
            <article className="alignment-row" key={item.id}>
              <div className="alignment-week"><span>{item.system}</span><strong>Week {item.week}</strong><small>Topic {item.number}</small></div>
              <div className="alignment-topic"><span className={`alignment-status alignment-status--${item.status}`}><i />{statusLabels[item.status]}</span><h3>{item.topic}</h3><p>{item.note}</p></div>
              <div className="alignment-source"><span>Start here</span><strong>{item.primary}</strong><small>{item.pages}</small></div>
              <div className="alignment-support"><span>Support / review</span><p>{item.support}</p>{reviewControls(item.id)}</div>
            </article>
          ))}
          {!filtered.length ? <div className="alignment-empty"><span>⌕</span><strong>No matching topics</strong><p>Try another system, status, or search phrase.</p></div> : null}
        </div>
      </section>

      <section className="alignment-next-step">
        <span aria-hidden="true">✓</span><div><strong>Steps 4–6 are ready.</strong><p>Approve individual mappings, upload the supporting source bundle, and import future ChatGPT alignment tables as private review drafts.</p></div><a href="/library">Upload source bundle</a>
      </section>
    </div>
  );
}
