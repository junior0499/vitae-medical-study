"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { extractSourceFile, type SourceExtractionResult } from "@/lib/source-extraction-client";

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
  sourceDetails: { bookTitle: string; bookEdition: string; sectionLabel: string; pageRange: string } | null;
  extraction: { status: string; method: string; pageCount: number; searchablePages: number; characterCount: number; warning: string } | null;
};
type FileUploadState = "waiting" | "uploading" | "extracting" | "indexing" | "ready" | "partial" | "needs_ocr" | "error";
type ProcessingJob = { id: string; documentId: string; status: string; totalPages: number; processedPages: number; filename: string; subject: string; warning: string };

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
  const [bookTitle, setBookTitle] = useState("");
  const [bookEdition, setBookEdition] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  const [pageRange, setPageRange] = useState("");
  const [state, setState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fileStates, setFileStates] = useState<Record<string, FileUploadState>>({});
  const [fileProgress, setFileProgress] = useState<Record<string, string>>({});
  const [indexStates, setIndexStates] = useState<Record<string, string>>({});
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);

  const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

  async function loadDocuments() {
    try {
      const response = await fetch("/api/documents");
      const data = await response.json();
      if (response.ok) setDocuments(data.documents ?? []);
    } catch { /* The empty library remains useful when offline. */ }
  }

  async function loadProcessingJobs() {
    try { const response = await fetch("/api/source-processing"); const data = await response.json(); if (response.ok) setProcessingJobs(data.jobs ?? []); } catch { /* The persisted queue can be retried later. */ }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/documents").then((response) => response.ok ? response.json() : null).then((data) => {
      if (active && data?.documents) setDocuments(data.documents);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => { let active = true; fetch("/api/source-processing").then((response) => response.ok ? response.json() : null).then((data) => { if (active && data?.jobs) setProcessingJobs(data.jobs); }).catch(() => undefined); return () => { active = false; }; }, []);

  function acceptFiles(incoming: FileList | null) {
    if (!incoming) return;
    setFiles(Array.from(incoming).slice(0, 5));
    setFileStates(Object.fromEntries(Array.from(incoming).slice(0, 5).map((file) => [fileKey(file), "waiting"])));
    setState("idle");
    setMessage("");
  }

  async function saveExtraction(documentId: string, extraction: SourceExtractionResult) {
    const response = await fetch("/api/document-extractions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentId, ...extraction }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "The source index could not be saved.");
    return data as { extraction: StudyDocument["extraction"]; processingJob: ProcessingJob };
  }

  async function processFastIndex(documentId: string) {
    setIndexStates((current) => ({ ...current, [documentId]: "Building the fast term index in small batches…" }));
    try {
      for (let batch = 0; batch < 12; batch += 1) {
        const response = await fetch("/api/source-processing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentId }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Fast indexing paused.");
        const job = data.job as ProcessingJob; const percentage = job.totalPages ? Math.round((job.processedPages / job.totalPages) * 100) : 100;
        setIndexStates((current) => ({ ...current, [documentId]: data.complete ? "Fast incremental index ready" : `Fast index ${percentage}% · upload remains usable` }));
        if (data.complete) break;
        await new Promise((resolve) => window.setTimeout(resolve, 60));
      }
      await loadProcessingJobs();
    } catch (error) { setIndexStates((current) => ({ ...current, [documentId]: error instanceof Error ? error.message : "Fast indexing paused." })); await loadProcessingJobs(); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) {
      setState("error"); setMessage("Choose at least one PDF or Word document."); return;
    }
    setState("uploading"); setMessage("Uploading each section independently so one problem cannot block the others…");
    const results = await Promise.all(files.map(async (file) => {
      const key = fileKey(file);
      setFileStates((current) => ({ ...current, [key]: "uploading" }));
      const form = new FormData();
      form.set("semester", semester); form.set("subject", subject); form.set("category", category);
      if (category === "Book section") {
        form.set("bookTitle", bookTitle); form.set("bookEdition", bookEdition);
        form.set("sectionLabel", sectionLabel); form.set("pageRange", pageRange);
      }
      form.append("files", file);
      try {
        const response = await fetch("/api/documents", { method: "POST", body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Upload failed");
        const document = data.documents?.[0] as StudyDocument | undefined;
        let extractionStatus = "uploaded";
        let extractionWarning = "";
        if (category === "Book section" && document) {
          try {
            setFileStates((current) => ({ ...current, [key]: "extracting" }));
            const extraction = await extractSourceFile(file, (progress) => setFileProgress((current) => ({ ...current, [key]: progress })));
            setFileStates((current) => ({ ...current, [key]: "indexing" }));
            const saved = await saveExtraction(document.id, extraction);
            extractionStatus = saved.extraction?.status ?? extraction.status;
            setFileStates((current) => ({ ...current, [key]: extractionStatus === "ready" ? "ready" : extractionStatus === "partial" ? "partial" : "needs_ocr" }));
            void processFastIndex(document.id);
          } catch (error) {
            extractionWarning = error instanceof Error ? error.message : "The deep index needs attention.";
            setFileStates((current) => ({ ...current, [key]: "needs_ocr" }));
            setFileProgress((current) => ({ ...current, [key]: "Original saved · retry the deep index from Your sources" }));
          }
        } else setFileStates((current) => ({ ...current, [key]: "ready" }));
        return { file, ok: true, error: "", warning: extractionWarning, indexed: extractionStatus === "ready" || extractionStatus === "partial" };
      } catch (error) {
        setFileStates((current) => ({ ...current, [key]: "error" }));
        return { file, ok: false, error: error instanceof Error ? error.message : "Upload failed", warning: "", indexed: false };
      }
    }));
    const successful = results.filter((result) => result.ok).length;
    const failed = results.filter((result) => !result.ok);
    setState(failed.length ? "error" : "success");
    const indexed = results.filter((result) => result.ok && result.indexed).length;
    const indexWarnings = results.filter((result) => result.ok && result.warning).length;
    setMessage(failed.length ? `${successful} added; ${failed.length} kept here to retry. ${failed[0].error}` : `${successful} ${successful === 1 ? "source" : "sources"} added independently${indexed ? ` · ${indexed} deep-search ${indexed === 1 ? "index" : "indexes"} ready` : ""}${indexWarnings ? ` · ${indexWarnings} original ${indexWarnings === 1 ? "is" : "are"} safe and can be indexed from Your sources` : ""}.`);
    setFiles(failed.map((result) => result.file));
    if (!failed.length && inputRef.current) inputRef.current.value = "";
    await loadDocuments();
  }

  async function indexDocument(document: StudyDocument) {
    setIndexStates((current) => ({ ...current, [document.id]: "Opening the private source…" }));
    try {
      const response = await fetch(`/api/documents/${document.id}`);
      if (!response.ok) throw new Error("The original source could not be opened.");
      const blob = await response.blob();
      const file = new File([blob], document.filename, { type: document.contentType });
      const extraction = await extractSourceFile(file, (progress) => setIndexStates((current) => ({ ...current, [document.id]: progress })));
      setIndexStates((current) => ({ ...current, [document.id]: "Saving the private search index…" }));
      const saved = await saveExtraction(document.id, extraction);
      setIndexStates((current) => ({ ...current, [document.id]: saved.extraction?.status === "ready" ? "Deep index ready · building fast terms…" : saved.extraction?.status === "partial" ? "Partial index saved · building fast terms…" : "OCR still needed" }));
      void processFastIndex(document.id);
      await loadDocuments();
    } catch (error) { setIndexStates((current) => ({ ...current, [document.id]: error instanceof Error ? error.message : "Indexing failed." })); }
  }

  const grouped = useMemo(() => {
    const result = new Map<number, StudyDocument[]>();
    documents.forEach((document) => result.set(document.semester, [...(result.get(document.semester) ?? []), document]));
    return Array.from(result.entries()).sort((a, b) => b[0] - a[0]);
  }, [documents]);

  return (
    <div className="library-page">
      <header className="library-heading">
        <div><span className="eyebrow"><i /> Private source library</span><h1>Bring your semester<br />into one place.</h1><p>Upload syllabi, textbooks, and lecture notes. Poh-tah-toh preserves the semester and subject so each source can support the right lesson later.</p></div>
        <div className="library-metrics"><span><strong>{documents.length}</strong><small>saved sources</small></span><span><strong>{new Set(documents.map((item) => item.subject)).size}</strong><small>subjects</small></span><span><strong>7</strong><small>semesters ready</small></span></div>
      </header>

      <section className="library-grid">
        <form className="upload-card" onSubmit={upload}>
          <header><div><span className="eyebrow">Add study material</span><h2>Upload sources</h2></div><span className="secure-pill">● Private</span></header>
          <div className="source-fields">
            <label><span>Semester</span><select value={semester} onChange={(event) => setSemester(event.target.value)}>{Array.from({ length: 7 }, (_, index) => <option value={index + 1} key={index + 1}>Semester {index + 1}</option>)}</select></label>
            <label><span>Subject</span><select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Source type</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{["Textbook", "Book section", "Syllabus", "Alignment plan", "Table of contents", "Lecture notes", "Guideline"].map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          {category === "Book section" ? <div className="book-section-fields">
            <label><span>Book title</span><input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} placeholder="e.g. Harrison’s Principles" required /></label>
            <label><span>Edition</span><input value={bookEdition} onChange={(event) => setBookEdition(event.target.value)} placeholder="e.g. 21st" /></label>
            <label><span>Chapter or section</span><input value={sectionLabel} onChange={(event) => setSectionLabel(event.target.value)} placeholder="e.g. Chapter 257 · Heart failure" required /></label>
            <label><span>Printed page range</span><input value={pageRange} onChange={(event) => setPageRange(event.target.value)} placeholder="Optional" /></label>
          </div> : null}
          <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFiles(event.dataTransfer.files); }}>
            <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,text/plain" onChange={(event) => acceptFiles(event.target.files)} />
            <span aria-hidden="true">⇧</span><strong>Drop your learning sources here</strong><p>syllabus, alignment, contents, or selected book sections</p><small>PDF, Word, CSV, or text · up to 5 files · 25 MB each</small>
          </label>
          {files.length ? <div className="selected-files">{files.map((file) => { const key = fileKey(file); const uploadState = fileStates[key] ?? "waiting"; const statusLabel = uploadState === "uploading" ? "uploading…" : uploadState === "extracting" ? fileProgress[key] || "extracting text…" : uploadState === "indexing" ? "saving search index…" : uploadState === "ready" ? "searchable" : uploadState === "partial" ? "partial index ready" : uploadState === "needs_ocr" ? "uploaded · OCR needs attention" : uploadState === "error" ? "retry needed" : "waiting"; return <div key={key}><span>{file.type === "application/pdf" ? "PDF" : "DOC"}</span><p><strong>{file.name}</strong><small>{formatBytes(file.size)} · {statusLabel}</small></p><button type="button" disabled={["uploading", "extracting", "indexing"].includes(uploadState)} onClick={() => setFiles((current) => current.filter((item) => item !== file))} aria-label={`Remove ${file.name}`}>×</button></div>; })}</div> : null}
          {message ? <p className={`upload-message upload-message--${state}`} role="status">{message}</p> : null}
          <button className="upload-submit" type="submit" disabled={state === "uploading"}>{state === "uploading" ? "Adding sources…" : `Add ${files.length || ""} ${files.length === 1 ? "source" : "sources"}`}<span>→</span></button>
        </form>

        <aside className="source-flow-card">
          <span className="eyebrow">How Poh-tah-toh uses sources</span><h2>Your material stays traceable.</h2>
          <ol><li><span>1</span><div><strong>Upload the syllabus</strong><p>Keep the official learning requirements.</p></div></li><li><span>2</span><div><strong>Add the alignment & contents</strong><p>Preserve the approved chapter plan.</p></div></li><li><span>3</span><div><strong>Add selected book sections</strong><p>Attach title, edition, chapter and pages.</p></div></li></ol>
          <div><span aria-hidden="true">⌁</span><p><strong>Private deep index</strong>PDF text, Word text, and small scanned sections are processed on this device. OCR runs only when a PDF page has no usable text layer. Independent fast path: every original remains safe if indexing needs a retry.</p></div>
          <a className="source-map-link" href="/alignment">Review the chapter map <span>→</span></a>
        </aside>
      </section>

      <section className="processing-dock" id="processing" aria-labelledby="processing-title"><header className="section-header"><div><span className="eyebrow">Recommendation 40 · High-speed pipeline</span><h2 id="processing-title">Incremental source processing</h2></div><button type="button" disabled={!processingJobs.some((job) => job.status !== "ready")} onClick={() => processingJobs.filter((job) => job.status !== "ready").forEach((job) => void processFastIndex(job.documentId))}>Continue queued work</button></header><p>Original sections become usable first. A compact term index then builds in eight-page batches, and common approved-source searches are cached for ten minutes.</p><div>{processingJobs.length ? processingJobs.slice(0, 8).map((job) => { const percentage = job.totalPages ? Math.round((job.processedPages / job.totalPages) * 100) : 100; return <article key={job.id}><span>{job.status === "ready" ? "✓" : "↻"}</span><div><strong>{job.filename}</strong><small>{job.subject} · {job.processedPages}/{job.totalPages} pages</small><i><b style={{ width: `${percentage}%` }} /></i></div><button type="button" disabled={job.status === "ready"} onClick={() => void processFastIndex(job.documentId)}>{job.status === "ready" ? "Ready" : "Process"}</button></article>; }) : <aside><strong>No fast-index jobs yet.</strong><p>Upload and deep-index a Book section to create the first durable background job.</p></aside>}</div></section>

      <section className="document-library" aria-labelledby="saved-sources-title">
        <header className="section-header"><div><span className="eyebrow">Saved by semester</span><h2 id="saved-sources-title">Your sources</h2></div><span>{documents.length ? "Open any original source" : "Your uploaded sources will appear here"}</span></header>
        {grouped.length ? grouped.map(([groupSemester, items]) => <div className="semester-group" key={groupSemester}><header><strong>Semester {groupSemester}</strong><span>{items.length} {items.length === 1 ? "source" : "sources"}</span></header><div>{items.map((document) => <article key={document.id}><span className={`document-type ${document.contentType === "application/pdf" ? "document-type--pdf" : ""}`}>{document.contentType === "application/pdf" ? "PDF" : document.contentType.includes("csv") || document.contentType === "text/plain" ? "TXT" : "DOC"}</span><div><strong>{document.filename}</strong><p>{document.subject} · {document.category} · {formatBytes(document.sizeBytes)}</p>{document.sourceDetails ? <small className="document-book-detail">{document.sourceDetails.bookTitle}{document.sourceDetails.bookEdition ? ` · ${document.sourceDetails.bookEdition}` : ""} · {document.sourceDetails.sectionLabel}{document.sourceDetails.pageRange ? ` · pp. ${document.sourceDetails.pageRange}` : ""}</small> : null}<small className={`document-index-status document-index-status--${document.extraction?.status ?? "missing"}`}>{indexStates[document.id] || (document.extraction ? `${document.extraction.searchablePages}/${document.extraction.pageCount || document.extraction.searchablePages} pages searchable${document.extraction.method.includes("ocr") ? " · OCR used" : ""}` : "Deep index not built")}</small></div><div className="document-actions"><a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer">Original ↗</a>{document.extraction?.searchablePages ? <a href={`/reader/${document.id}`}>Read text →</a> : null}{document.category === "Book section" ? <button type="button" onClick={() => indexDocument(document)} disabled={Boolean(indexStates[document.id]?.endsWith("…"))}>{document.extraction ? "Rebuild index" : "Build deep index"}</button> : null}</div></article>)}</div></div>) : <div className="empty-library"><span>▤</span><h3>Your library is ready.</h3><p>Add the first syllabus or textbook above. It will be saved privately and organized by semester.</p></div>}
      </section>
    </div>
  );
}
