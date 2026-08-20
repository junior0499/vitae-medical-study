/* eslint-disable jsx-a11y/label-has-associated-control, react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { offlineQueueCount, saveTravelPack } from "@/lib/offline-client";
import { getOfflinePackUrls, offlinePacks } from "@/lib/offline-packs";

export function OfflineWorkspace() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [queued, setQueued] = useState(() => typeof window === "undefined" ? 0 : offlineQueueCount());
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>(["cardiovascular", "exam-sprint"]);
  useEffect(() => {
    const update = () => { setOnline(window.navigator.onLine); setQueued(offlineQueueCount()); };
    window.addEventListener("online", update); window.addEventListener("offline", update); window.addEventListener("vitae-offline-queue", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); window.removeEventListener("vitae-offline-queue", update); };
  }, []);
  useEffect(() => { try { const saved = JSON.parse(window.localStorage.getItem("poh-tah-toh-offline-packs-v1") ?? "[]") as string[]; if (Array.isArray(saved) && saved.length) setSelected(saved.filter((id) => offlinePacks.some((pack) => pack.id === id))); } catch { /* Use the useful starter selection. */ } }, []);
  const urls = getOfflinePackUrls(selected);
  function toggle(id: string) { setSelected((current) => { const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]; window.localStorage.setItem("poh-tah-toh-offline-packs-v1", JSON.stringify(next)); return next; }); }
  async function prepare() {
    if (!selected.length) { setMessage("Choose at least one subject, system, or exam block."); return; }
    setMessage(`Preparing ${urls.length} lightweight pages…`);
    try { const result = await saveTravelPack(urls); setMessage(`${result.cached} pages saved on this device${result.failed ? ` · ${result.failed} could not be cached and can be retried` : ""}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The travel pack could not be prepared."); }
  }
  return <div className="offline-page"><header className="offline-hero"><div><span className="eyebrow"><i /> Recommendation 39 · Custom offline packs</span><h1>Carry only the block<br />you plan to study.</h1><p>Choose a clinical subject, system, or examination block. Poh-tah-toh replaces the old fixed pack with your lightweight selection and keeps textbook files out.</p><button className="primary-button primary-button--dark" type="button" onClick={prepare}>Save selected pack <span>↓</span></button>{message ? <small role="status">{message}</small> : null}</div><div><span className={online ? "is-online" : ""}>{online ? "Online now" : "Offline now"}</span><strong>{urls.length}<small>pages in this pack</small></strong><p>{queued} private changes are waiting to sync. Original PDFs remain excluded.</p></div></header><section className="offline-pack-builder"><header className="section-header"><div><span className="eyebrow">Build your device pack</span><h2>Subjects, systems & exam blocks</h2></div><button type="button" onClick={() => { setSelected(offlinePacks.map((pack) => pack.id)); window.localStorage.setItem("poh-tah-toh-offline-packs-v1", JSON.stringify(offlinePacks.map((pack) => pack.id))); }}>Select all</button></header><div>{(["subject", "system", "exam"] as const).map((kind) => <section key={kind}><h3>{kind === "subject" ? "Clinical subjects" : kind === "system" ? "Systems" : "Examination blocks"}</h3>{offlinePacks.filter((pack) => pack.kind === kind).map((pack) => <label className={selected.includes(pack.id) ? "is-selected" : ""} key={pack.id}><input type="checkbox" checked={selected.includes(pack.id)} onChange={() => toggle(pack.id)} /><span><strong>{pack.title}</strong><p>{pack.detail}</p><small>{pack.urls.length} learning pages</small></span></label>)}</section>)}</div></section><section className="offline-features"><article><span>01</span><strong>Replaceable</strong><p>Saving again replaces the previous custom page list instead of growing one invisible pack forever.</p></article><article><span>02</span><strong>Lightweight</strong><p>Only chosen app pages are cached. Private PDFs and extracted book text remain online-only.</p></article><article><span>03</span><strong>Private drafts</strong><p>Offline notes and recall ratings wait locally, then sync with your account.</p></article></section><aside className="offline-safety"><span>⌁</span><div><strong>Use travel mode on a private device.</strong><p>Offline drafts and your pack preference are stored in this browser until changes sync.</p></div><a href="/learn">Return to learning</a></aside></div>;
}
