"use client";

import { useEffect, useMemo, useState } from "react";

type Page = { pageNumber: number; printedPage: string; text: string; method: string };
type Citation = { id: string; lessonSlug: string; pageNumber: number; printedPage: string; quote: string; noteText: string; createdAt: string };
type LessonLink = { lessonSlug: string; title: string; alignmentId: string; decision: string };
type ReaderData = {
  document: { id: string; filename: string; subject: string; category: string; contentType: string };
  detail: { bookTitle: string; bookEdition: string; sectionLabel: string; pageRange: string } | null;
  extraction: { status: string; method: string; pageCount: number; searchablePages: number; warning: string } | null;
  pages: Page[];
  citations: Citation[];
  lessonLinks: LessonLink[];
  approved: boolean;
};

function highlightedText(text: string, query: string, savedQuotes: string[]) {
  const needles = [{ text: query.trim(), type: "search" }, ...savedQuotes.map((quote) => ({ text: quote, type: "saved" }))].filter((needle) => needle.text.length >= 2);
  const ranges: Array<{ start: number; end: number; type: string }> = [];
  const lower = text.toLowerCase();
  for (const needle of needles) {
    const index = lower.indexOf(needle.text.toLowerCase());
    if (index >= 0) ranges.push({ start: index, end: index + needle.text.length, type: needle.type });
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const usable = ranges.filter((range, index) => index === 0 || range.start >= ranges[index - 1].end);
  if (!usable.length) return text;
  const output: React.ReactNode[] = [];
  let cursor = 0;
  for (const range of usable) {
    output.push(text.slice(cursor, range.start));
    output.push(<mark className={range.type === "saved" ? "is-saved" : ""} key={`${range.start}-${range.end}`}>{text.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  }
  output.push(text.slice(cursor));
  return output;
}

export function SourceReaderWorkspace({ documentId }: { documentId: string }) {
  const [data, setData] = useState<ReaderData | null>(null);
  const [message, setMessage] = useState("Loading the private indexed section…");
  const [query, setQuery] = useState("");
  const [requestedLesson, setRequestedLesson] = useState("");
  const [selectedLesson, setSelectedLesson] = useState("");
  const [selectedQuote, setSelectedQuote] = useState("");
  const [selectedPage, setSelectedPage] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const page = Math.max(1, Number(params.get("page")) || 1);
    const initialQuery = params.get("q") ?? "";
    const lesson = params.get("lesson") ?? "";
    fetch(`/api/source-reader?document=${encodeURIComponent(documentId)}`).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The source reader could not be loaded.");
      return payload as ReaderData;
    }).then((payload) => {
      if (!active) return;
      setData(payload); setQuery(initialQuery); setRequestedLesson(lesson); setSelectedLesson(lesson || payload.lessonLinks.find((item) => item.decision === "approved")?.lessonSlug || payload.lessonLinks[0]?.lessonSlug || "cardiac-cycle"); setMessage("");
      window.setTimeout(() => document.getElementById(`source-page-${page}`)?.scrollIntoView({ block: "start" }), 80);
    }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "The source reader could not be loaded."); });
    return () => { active = false; };
  }, [documentId]);

  const lessonOptions = useMemo(() => {
    const values = data?.lessonLinks.map((lesson) => ({ value: lesson.lessonSlug, label: `${lesson.title} · ${lesson.decision.replaceAll("_", " ")}` })) ?? [];
    if (requestedLesson && !values.some((option) => option.value === requestedLesson)) values.unshift({ value: requestedLesson, label: `${requestedLesson.replaceAll("-", " ")} · current lesson` });
    return values.length ? values : [{ value: "cardiac-cycle", label: "Cardiac cycle · current foundation" }, { value: "cardiac-output", label: "Cardiac output · current foundation" }];
  }, [data, requestedLesson]);
  const matchingPages = useMemo(() => !query.trim() || !data ? [] : data.pages.filter((page) => page.text.toLowerCase().includes(query.toLowerCase())).map((page) => page.pageNumber), [data, query]);

  function captureSelection() {
    const selection = window.getSelection();
    const quote = selection?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (quote.length < 8) return;
    const anchor = selection?.anchorNode;
    const element = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as Element | null;
    const pageNumber = Number(element?.closest<HTMLElement>("[data-source-page]")?.dataset.sourcePage);
    if (!Number.isInteger(pageNumber) || pageNumber < 1) { setMessage("Keep the highlight inside one indexed page, then try again."); return; }
    setSelectedPage(pageNumber); setSelectedQuote(quote.slice(0, 800)); setMessage("Passage highlighted. Add a short connection, then attach it to your notes.");
  }

  async function attachCitation() {
    if (!selectedQuote || !selectedPage || !selectedLesson) { setMessage("Highlight a passage and choose its lesson first."); return; }
    setSaving(true); setMessage("Attaching the exact passage and page to your lesson notes…");
    try {
      const response = await fetch("/api/source-reader", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentId, lessonSlug: selectedLesson, pageNumber: selectedPage, quote: selectedQuote, noteText }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The citation could not be attached.");
      setData((current) => current ? { ...current, citations: [payload.citation, ...current.citations] } : current);
      setSelectedQuote(""); setNoteText(""); setMessage(`Attached to ${selectedLesson.replaceAll("-", " ")} notes with ${payload.sourceLabel}.`);
      window.getSelection()?.removeAllRanges();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The citation could not be attached."); }
    finally { setSaving(false); }
  }

  if (!data) return <div className="source-reader-page"><section className="reader-loading"><span>⌁</span><strong>{message}</strong></section></div>;
  const title = data.detail?.bookTitle || data.document.filename;
  return <div className="source-reader-page"><header className="source-reader-hero"><div><span className="eyebrow"><i /> Recommendation 27 · Source-linked reader</span><h1>{title}</h1><p>{[data.detail?.bookEdition, data.detail?.sectionLabel, data.detail?.pageRange ? `pp. ${data.detail.pageRange}` : ""].filter(Boolean).join(" · ") || data.document.filename}</p><div><span className={data.approved ? "is-approved" : ""}>{data.approved ? "Approved learning route" : "Owner source · approval pending"}</span><span>{data.extraction?.method.includes("ocr") ? "OCR + PDF text" : data.extraction?.method.replaceAll("_", " ") || "No deep index"}</span></div></div><aside><strong>{data.pages.length}</strong><span>searchable pages</span><a href={`/api/documents/${documentId}`} target="_blank" rel="noreferrer">Open original file ↗</a></aside></header><section className="reader-toolbar"><label><span>Find inside this section</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a phrase…" /></label><div><strong>{query ? `${matchingPages.length} matching pages` : "Select text to highlight"}</strong>{matchingPages.length ? <span>{matchingPages.slice(0, 10).map((pageNumber) => <button type="button" key={pageNumber} onClick={() => document.getElementById(`source-page-${pageNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{pageNumber}</button>)}</span> : null}</div></section>{data.pages.length ? <div className="source-reader-grid"><main className="source-pages">{data.pages.map((page) => <article id={`source-page-${page.pageNumber}`} data-source-page={page.pageNumber} key={page.pageNumber}><header><span>{page.printedPage ? `Printed page ${page.printedPage}` : `Source part ${page.pageNumber}`}</span><small>{page.method.includes("ocr") ? "OCR text · verify against original" : "Extracted text"}</small></header><p>{highlightedText(page.text, query, data.citations.filter((citation) => citation.pageNumber === page.pageNumber).map((citation) => citation.quote))}</p></article>)}</main><aside className="citation-rail"><section><span className="eyebrow">Attach to notes</span><h2>Keep the evidence with the idea.</h2><label><span>Lesson notebook</span><select value={selectedLesson} onChange={(event) => setSelectedLesson(event.target.value)}>{lessonOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><label><span>Highlighted passage</span><textarea value={selectedQuote} onChange={(event) => setSelectedQuote(event.target.value.slice(0, 800))} placeholder="Select text in a page on the left, then use it below." /></label><button className="capture-selection" type="button" onClick={captureSelection}>Use selected text</button><label><span>My connection</span><textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Why this passage matters…" /></label><button type="button" disabled={saving || !selectedQuote} onClick={attachCitation}>{saving ? "Attaching…" : "Attach passage + page"}</button><p role="status">{message || "The quote is checked against the indexed page before it can be attached."}</p></section><section className="saved-citations"><header><strong>Saved highlights</strong><span>{data.citations.length}</span></header>{data.citations.length ? data.citations.map((citation) => <button type="button" key={citation.id} onClick={() => document.getElementById(`source-page-${citation.pageNumber}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}><span>{citation.printedPage ? `p. ${citation.printedPage}` : `Part ${citation.pageNumber}`} · {citation.lessonSlug.replaceAll("-", " ")}</span><q>{citation.quote}</q>{citation.noteText ? <small>{citation.noteText}</small> : null}</button>) : <p>No saved highlights yet.</p>}</section></aside></div> : <section className="reader-empty"><strong>This file has no readable deep index yet.</strong><p>{data.extraction?.warning || "Build its PDF, Word, or OCR index from the Library, then return here."}</p><a href="/library">Build deep index</a></section>}</div>;
}
