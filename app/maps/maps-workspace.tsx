"use client";

import { useEffect, useState } from "react";

type MapRow = { id: string; lessonSlug: string; title: string; nodesJson: string; updatedAt: string };
type MapNode = { label: string; detail: string };

function nodesFor(map: MapRow): MapNode[] {
  try { return JSON.parse(map.nodesJson) as MapNode[]; } catch { return []; }
}

export function MapsWorkspace() {
  const [maps, setMaps] = useState<MapRow[]>([]);
  useEffect(() => {
    let active = true;
    fetch("/api/mind-maps").then((response) => response.ok ? response.json() : null).then((data) => {
      if (active && data?.maps) setMaps(data.maps);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <div className="maps-page"><header className="maps-hero"><div><span className="eyebrow"><i /> Note-built connections</span><h1>Your thinking,<br />laid out sideways.</h1><p>Vitae turns clear note lines into a connected revision map. It organizes your words; it does not silently add textbook claims.</p></div><a className="primary-button primary-button--dark" href="/learn">Open a lesson <span>→</span></a></header>
    <section className="saved-maps" aria-labelledby="saved-maps-title"><header className="section-header"><div><span className="eyebrow">Generated from your notes</span><h2 id="saved-maps-title">Saved sideways maps</h2></div><span>{maps.length} maps</span></header>{maps.length ? <div>{maps.map((map) => <article key={map.id}><header><div><span>{map.lessonSlug.replaceAll("-", " ")}</span><h3>{map.title}</h3></div><a href={`/learn/cardiovascular/${map.lessonSlug}`}>Open lesson →</a></header><div className="saved-map-track">{nodesFor(map).map((node, index, nodes) => <div key={`${node.label}-${index}`}><span>{index + 1}</span><strong>{node.label}</strong><p>{node.detail}</p>{index < nodes.length - 1 ? <i>→</i> : null}</div>)}</div><small>Updated {new Date(map.updatedAt).toLocaleDateString("en", { day: "numeric", month: "short" })}</small></article>)}</div> : <div className="map-empty"><span>⌁</span><h3>No note-built maps yet.</h3><p>Write at least two clear lines in a lesson notebook, then choose “Build sideways map.”</p><a href="/learn/cardiovascular/cardiac-cycle">Open cardiac cycle</a></div>}</section>
  </div>;
}
