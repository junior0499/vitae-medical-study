"use client";

import { FormEvent, useEffect, useState } from "react";

type SearchResult = { documentId: string; filename: string; contentType: string; subject: string; bookTitle: string; edition: string; section: string; pageRange: string; routes: Array<{ alignmentId: string; objective: string; system: string; lessonSlug: string }>; extraction: { status: string; method: string; searchablePages: number; pageCount: number } | null; matchKind: string; snippet: string; matchPages: Array<{ pageNumber: number; printedPage: string; snippet: string }>; openHref: string; originalHref: string };
type SearchData = { query: string; results: SearchResult[]; summary: { approvedMappings: number; approvedBookSections: number; contentSearchable: number; indexedPages: number }; scope: string };
const emptyData: SearchData = { query: "", results: [], summary: { approvedMappings: 0, approvedBookSections: 0, contentSearchable: 0, indexedPages: 0 }, scope: "" };

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
  return <div className="source-search-page"><header className="source-search-hero"><div><span className="eyebrow"><i /> Recommendations 23 + 26 · Deep source search</span><h1>Search the approved shelf.<br />Down to the passage.</h1><p>Search extracted PDF, Word, and OCR text only inside uploaded Book sections still connected to an approved syllabus mapping. Results jump to the matching source page.</p></div><div><strong>{data.summary.indexedPages}</strong><span>private searchable pages</span><p>{data.summary.approvedMappings} approved mappings · {data.summary.contentSearchable}/{data.summary.approvedBookSections} sections indexed</p></div></header><form className="source-search-box" onSubmit={submit}><label htmlFor="approved-source-query">Search a concept, phrase, objective, book, chapter, or page</label><div><input id="approved-source-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. afterload, ventricular pressure, cardiac output…" /><button type="submit" disabled={loading}>{loading ? "Searching passages…" : "Search approved sources"}</button></div><small>{data.scope || "Only approved owner-held sources will appear."}</small></form><section className="source-search-results" aria-live="polite"><header className="section-header"><div><span className="eyebrow">Approved results</span><h2>{data.query ? `Matches for “${data.query}”` : "Your searchable source routes"}</h2></div><span>{message}</span></header>{data.results.length ? <div>{data.results.map((result) => <article key={result.documentId}><header><span>{result.matchKind}</span><small>{result.subject}</small></header><h3>{result.bookTitle}</h3><p className="source-search-location">{[result.edition, result.section, result.pageRange ? `pp. ${result.pageRange}` : ""].filter(Boolean).join(" · ") || result.filename}</p>{result.snippet ? <p className="source-search-snippet">{result.snippet}</p> : null}{result.matchPages.length > 1 ? <div className="source-search-pages">{result.matchPages.map((page) => <a href={`/reader/${result.documentId}?page=${page.pageNumber}&q=${encodeURIComponent(data.query)}`} key={page.pageNumber}>{page.printedPage ? `p. ${page.printedPage}` : `PDF page ${page.pageNumber}`}</a>)}</div> : null}<div className="source-search-routes">{result.routes.map((route) => <span key={route.alignmentId}><b>{route.system}</b>{route.objective}</span>)}</div><footer><small>{result.extraction ? `${result.extraction.searchablePages}/${result.extraction.pageCount || result.extraction.searchablePages} pages indexed` : "Metadata only · build index in Library"}</small><span><a href={result.originalHref} target="_blank" rel="noreferrer">Original ↗</a><a href={result.openHref}>{result.extraction?.searchablePages ? "Open linked reader →" : "Open source →"}</a></span></footer></article>)}</div> : <aside><strong>No approved source matches yet.</strong><p>{data.summary.approvedBookSections ? "Try a shorter term, or build the section’s deep index from your Library." : "Approve a source mapping and create its source-locked lesson draft to place that Book section on the searchable shelf."}</p><a href={data.summary.approvedBookSections ? "/library" : "/alignment"}>{data.summary.approvedBookSections ? "Build deep index" : "Review source mappings"}</a></aside>}</section></div>;
}
