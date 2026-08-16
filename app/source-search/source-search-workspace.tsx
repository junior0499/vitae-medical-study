"use client";

import { FormEvent, useEffect, useState } from "react";

type SearchResult = { documentId: string; filename: string; contentType: string; subject: string; bookTitle: string; edition: string; section: string; pageRange: string; routes: Array<{ alignmentId: string; objective: string; system: string }>; matchKind: string; snippet: string; openHref: string };
type SearchData = { query: string; results: SearchResult[]; summary: { approvedMappings: number; approvedBookSections: number; contentSearchable: number }; scope: string };
const emptyData: SearchData = { query: "", results: [], summary: { approvedMappings: 0, approvedBookSections: 0, contentSearchable: 0 }, scope: "" };

export function SourceSearchWorkspace() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  async function search(value: string) {
    setLoading(true); setMessage(value ? "Searching approved source routes…" : "Loading the approved source index…");
    try {
      const response = await fetch(`/api/source-search?q=${encodeURIComponent(value)}`);
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Source search failed.");
      setData(payload); setMessage(value ? `${payload.results.length} approved ${payload.results.length === 1 ? "result" : "results"} found.` : "Approved source index ready.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Source search failed."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/source-search?q=").then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Source search failed.");
      return payload as SearchData;
    }).then((payload) => {
      if (!active) return;
      setData(payload); setMessage("Approved source index ready."); setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setMessage(error instanceof Error ? error.message : "Source search failed."); setLoading(false);
    });
    return () => { active = false; };
  }, []);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void search(query.trim()); }
  return <div className="source-search-page"><header className="source-search-hero"><div><span className="eyebrow"><i /> Recommendation 23 · Smart source search</span><h1>Search the approved shelf.<br />Nothing outside it.</h1><p>Results come only from uploaded Book sections still connected to an approved syllabus mapping. Open the exact file at its stored chapter or PDF page range.</p></div><div><strong>{data.summary.approvedBookSections}</strong><span>approved book sections</span><p>{data.summary.approvedMappings} approved mappings · {data.summary.contentSearchable} text-searchable files</p></div></header><form className="source-search-box" onSubmit={submit}><label htmlFor="approved-source-query">Search topic, objective, book, chapter, or page</label><div><input id="approved-source-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. afterload, cardiac output, chapter title…" /><button type="submit" disabled={loading}>{loading ? "Searching…" : "Search approved sources"}</button></div><small>{data.scope || "Only approved owner-held sources will appear."}</small></form><section className="source-search-results" aria-live="polite"><header className="section-header"><div><span className="eyebrow">Approved results</span><h2>{data.query ? `Matches for “${data.query}”` : "Your searchable source routes"}</h2></div><span>{message}</span></header>{data.results.length ? <div>{data.results.map((result) => <article key={result.documentId}><header><span>{result.matchKind}</span><small>{result.subject}</small></header><h3>{result.bookTitle}</h3><p className="source-search-location">{[result.edition, result.section, result.pageRange ? `pp. ${result.pageRange}` : ""].filter(Boolean).join(" · ") || result.filename}</p>{result.snippet ? <p className="source-search-snippet">{result.snippet}</p> : null}<div className="source-search-routes">{result.routes.map((route) => <span key={route.alignmentId}><b>{route.system}</b>{route.objective}</span>)}</div><footer><small>{result.filename}</small><a href={result.openHref} target="_blank" rel="noreferrer">Open chapter or page →</a></footer></article>)}</div> : <aside><strong>No approved source matches yet.</strong><p>{data.summary.approvedBookSections ? "Try the book title, chapter label, mapped objective, or a shorter term." : "Approve a source mapping and create its source-locked lesson draft to place that Book section on the searchable shelf."}</p><a href="/alignment">Review source mappings</a></aside>}</section></div>;
}
