"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type StudyDocument = {
  id: string;
  semester: number;
  subject: string;
  category: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
};

const subjects = ["Internal Medicine", "Perioperative Medicine", "Women & Child Health", "Foundations", "Other"];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LibraryWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [semester, setSemester] = useState("7");
  const [subject, setSubject] = useState(subjects[0]);
  const [category, setCategory] = useState("Textbook");
  const [state, setState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function loadDocuments() {
    try {
      const response = await fetch("/api/documents");
      const data = await response.json();
      if (response.ok) setDocuments(data.documents ?? []);
    } catch { /* The empty library remains useful when offline. */ }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/documents").then((response) => response.ok ? response.json() : null).then((data) => {
      if (active && data?.documents) setDocuments(data.documents);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function acceptFiles(incoming: FileList | null) {
    if (!incoming) return;
    setFiles(Array.from(incoming).slice(0, 5));
    setState("idle");
    setMessage("");
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) {
      setState("error"); setMessage("Choose at least one PDF or Word document."); return;
    }
    setState("uploading"); setMessage("Uploading and organizing your sources…");
    const form = new FormData();
    form.set("semester", semester); form.set("subject", subject); form.set("category", category);
    files.forEach((file) => form.append("files", file));
    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      setState("success"); setMessage(`${files.length} ${files.length === 1 ? "source" : "sources"} added to Semester ${semester}.`);
      setFiles([]); if (inputRef.current) inputRef.current.value = "";
      await loadDocuments();
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    }
  }

  const grouped = useMemo(() => {
    const result = new Map<number, StudyDocument[]>();
    documents.forEach((document) => result.set(document.semester, [...(result.get(document.semester) ?? []), document]));
    return Array.from(result.entries()).sort((a, b) => b[0] - a[0]);
  }, [documents]);

  return (
    <div className="library-page">
      <header className="library-heading">
        <div><span className="eyebrow"><i /> Private source library</span><h1>Bring your semester<br />into one place.</h1><p>Upload syllabi, textbooks, and lecture notes. Vitae preserves the semester and subject so each source can support the right lesson later.</p></div>
        <div className="library-metrics"><span><strong>{documents.length}</strong><small>saved sources</small></span><span><strong>{new Set(documents.map((item) => item.subject)).size}</strong><small>subjects</small></span><span><strong>7</strong><small>semesters ready</small></span></div>
      </header>

      <section className="library-grid">
        <form className="upload-card" onSubmit={upload}>
          <header><div><span className="eyebrow">Add study material</span><h2>Upload sources</h2></div><span className="secure-pill">● Private</span></header>
          <div className="source-fields">
            <label><span>Semester</span><select value={semester} onChange={(event) => setSemester(event.target.value)}>{Array.from({ length: 7 }, (_, index) => <option value={index + 1} key={index + 1}>Semester {index + 1}</option>)}</select></label>
            <label><span>Subject</span><select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Source type</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{["Textbook", "Syllabus", "Lecture notes", "Guideline"].map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFiles(event.dataTransfer.files); }}>
            <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => acceptFiles(event.target.files)} />
            <span aria-hidden="true">⇧</span><strong>Drop your books or syllabi here</strong><p>or choose files from your device</p><small>PDF or Word · up to 5 files · 25 MB each</small>
          </label>
          {files.length ? <div className="selected-files">{files.map((file) => <div key={`${file.name}-${file.size}`}><span>{file.type === "application/pdf" ? "PDF" : "DOC"}</span><p><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></p><button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}>×</button></div>)}</div> : null}
          {message ? <p className={`upload-message upload-message--${state}`} role="status">{message}</p> : null}
          <button className="upload-submit" type="submit" disabled={state === "uploading"}>{state === "uploading" ? "Adding sources…" : `Add ${files.length || ""} ${files.length === 1 ? "source" : "sources"}`}<span>→</span></button>
        </form>

        <aside className="source-flow-card">
          <span className="eyebrow">How Vitae uses sources</span><h2>Your material stays traceable.</h2>
          <ol><li><span>1</span><div><strong>Organize</strong><p>Semester, subject, and source type stay attached.</p></div></li><li><span>2</span><div><strong>Connect</strong><p>Lessons can point back to the right material.</p></div></li><li><span>3</span><div><strong>Teach clearly</strong><p>Source material and professor explanation remain visibly separate.</p></div></li></ol>
          <div><span aria-hidden="true">⌁</span><p><strong>Current capability</strong>Files are securely stored and organized. Automatic extraction and page-level lesson citations will be added in the next source-processing stage.</p></div>
        </aside>
      </section>

      <section className="document-library" aria-labelledby="saved-sources-title">
        <header className="section-header"><div><span className="eyebrow">Saved by semester</span><h2 id="saved-sources-title">Your sources</h2></div><span>{documents.length ? "Open any original source" : "Your uploaded sources will appear here"}</span></header>
        {grouped.length ? grouped.map(([groupSemester, items]) => <div className="semester-group" key={groupSemester}><header><strong>Semester {groupSemester}</strong><span>{items.length} {items.length === 1 ? "source" : "sources"}</span></header><div>{items.map((document) => <article key={document.id}><span className={`document-type ${document.contentType === "application/pdf" ? "document-type--pdf" : ""}`}>{document.contentType === "application/pdf" ? "PDF" : "DOC"}</span><div><strong>{document.filename}</strong><p>{document.subject} · {document.category} · {formatBytes(document.sizeBytes)}</p></div><span>{new Date(document.createdAt).toLocaleDateString("en", { day: "numeric", month: "short" })}</span><a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer">Open ↗</a></article>)}</div></div>) : <div className="empty-library"><span>▤</span><h3>Your library is ready.</h3><p>Add the first syllabus or textbook above. It will be saved privately and organized by semester.</p></div>}
      </section>
    </div>
  );
}
