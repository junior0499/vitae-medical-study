"use client";

import { useCallback, useEffect, useState } from "react";

const fieldDefinitions = [
  ["condition", "Condition", "Name only the condition covered by the approved source."],
  ["enablingConditions", "Enabling conditions", "Risk factors, epidemiology, or context supported by this section."],
  ["mechanism", "Mechanism", "Build the causal pathophysiology chain."],
  ["consequences", "Consequences", "State what follows from the mechanism."],
  ["presentation", "Presentation", "Symptoms, signs, and patterns explicitly supported."],
  ["investigations", "Investigations", "Tests and expected findings supported by the source."],
  ["differentials", "Differentials", "Only alternatives directly supported or reviewed."],
  ["management", "Management", "Keep empty when the approved section does not support treatment."],
] as const;
type FieldKey = (typeof fieldDefinitions)[number][0];
type EvidenceState = "supported" | "not_in_source" | "not_required";
type Pack = { id: string; objectiveId: string; title: string; sourceLabel: string; sourceQuote: string; readerHref: string };
type Script = { id: string; sourcePackId: string; title: string; status: string; reviewerNote: string; script: { fields: Record<FieldKey, string>; evidence: Record<FieldKey, EvidenceState> } };

const emptyFields = Object.fromEntries(fieldDefinitions.map(([key]) => [key, ""])) as Record<FieldKey, string>;
const emptyEvidence = Object.fromEntries(fieldDefinitions.map(([key]) => [key, "not_in_source"])) as Record<FieldKey, EvidenceState>;

export function IllnessScriptWorkspace() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [sourcePackId, setSourcePackId] = useState("");
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<Record<FieldKey, string>>({ ...emptyFields });
  const [evidence, setEvidence] = useState<Record<FieldKey, EvidenceState>>({ ...emptyEvidence });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Loading approved source packs…");
  const selectedPack = packs.find((pack) => pack.id === sourcePackId);

  const load = useCallback(async () => {
    const response = await fetch("/api/illness-scripts"); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Illness scripts could not be loaded.");
    setPacks(data.packs ?? []); setScripts(data.scripts ?? []); setNotes(Object.fromEntries((data.scripts ?? []).map((script: Script) => [script.id, script.reviewerNote]))); if (!sourcePackId && data.packs?.[0]) setSourcePackId(data.packs[0].id); setMessage("");
  }, [sourcePackId]);

  useEffect(() => { let active = true; fetch("/api/illness-scripts").then((response) => response.ok ? response.json() : null).then((data) => { if (!active || !data) return; setPacks(data.packs ?? []); setScripts(data.scripts ?? []); setNotes(Object.fromEntries((data.scripts ?? []).map((script: Script) => [script.id, script.reviewerNote]))); if (data.packs?.[0]) setSourcePackId(data.packs[0].id); setMessage(""); }).catch(() => { if (active) setMessage("Illness scripts could not be loaded."); }); return () => { active = false; }; }, []);

  async function saveScript() {
    setMessage("Saving the illness script behind human review…");
    try { const response = await fetch("/api/illness-scripts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourcePackId, title, script: { fields, evidence } }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "The illness script could not be saved."); setMessage("Illness script saved as pending review. It cannot enter differential training yet."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "The illness script could not be saved."); }
  }

  async function review(script: Script, status: "approved" | "changes_requested") {
    setMessage("Saving the individual script review…");
    try { const response = await fetch("/api/illness-scripts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: script.id, status, reviewerNote: notes[script.id] ?? "" }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "The script review could not be saved."); setMessage(status === "approved" ? "Illness script approved for diagnostic comparison." : "Changes requested; the script remains excluded from practice."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "The script review could not be saved."); }
  }

  function editScript(script: Script) { setSourcePackId(script.sourcePackId); setTitle(script.title); setFields({ ...emptyFields, ...script.script.fields }); setEvidence({ ...emptyEvidence, ...script.script.evidence }); document.getElementById("script-builder")?.scrollIntoView({ behavior: "smooth" }); }

  return <div className="script-page"><header className="script-hero"><div><span className="eyebrow"><i /> Recommendation 52 · Illness Script Builder</span><h1>Organize the disease<br />the way reasoning needs it.</h1><p>Build enabling conditions, mechanism, consequences, presentation, investigations, differentials, and management from a reviewed source pack. Unsupported sections stay visibly empty.</p><a className="primary-button primary-button--dark" href="#script-builder">Build an illness script <span>→</span></a></div><div><span><strong>{scripts.length}</strong><small>saved scripts</small></span><span><strong>{scripts.filter((item) => item.status === "approved").length}</strong><small>approved</small></span><p>{packs.length} approved source {packs.length === 1 ? "pack" : "packs"} available</p></div></header>
    <aside className="script-rule"><span>⌁</span><div><strong>Blank is safer than invented.</strong><p>A field marked “not in source” cannot contain clinical text when the script is approved. Management remains locked until its own evidence is present.</p></div><a href="/source-packs">Review source packs</a></aside>
    <section id="script-builder" className="script-builder"><header className="section-header"><div><span className="eyebrow">Source-bounded authoring</span><h2>Build the clinical structure</h2></div><span>Every populated field needs support</span></header>{packs.length ? <><div className="script-source"><label><span>Approved source pack</span><select value={sourcePackId} onChange={(event) => setSourcePackId(event.target.value)}>{packs.map((pack) => <option value={pack.id} key={pack.id}>{pack.title}</option>)}</select></label><label><span>Condition name</span><input value={title} onChange={(event) => { setTitle(event.target.value); setFields((current) => ({ ...current, condition: event.target.value })); }} placeholder="Condition covered by this section" /></label>{selectedPack ? <blockquote><span>Exact approved evidence</span><p>{selectedPack.sourceQuote}</p><small>{selectedPack.sourceLabel}</small><a href={selectedPack.readerHref}>Inspect page →</a></blockquote> : null}</div><div className="script-fields">{fieldDefinitions.map(([key, label, help], index) => <article key={key}><header><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{label}</strong><small>{help}</small></div><select aria-label={`${label} evidence state`} value={evidence[key]} onChange={(event) => setEvidence((current) => ({ ...current, [key]: event.target.value as EvidenceState }))}><option value="supported">Supported by pack</option><option value="not_in_source">Not in source</option><option value="not_required">Not required yet</option></select></header><textarea value={fields[key]} onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))} disabled={evidence[key] !== "supported"} placeholder={evidence[key] === "supported" ? `Write only the source-supported ${label.toLowerCase()}…` : "This section remains visibly empty."} /></article>)}</div><button className="script-save" type="button" disabled={!sourcePackId || !title.trim()} onClick={saveScript}>Save for human review <span>→</span></button></> : <div className="script-empty"><span>⌁</span><h3>No approved source pack yet</h3><p>Prepare and approve one exact passage before writing an illness script.</p><a href="/source-packs">Open Source Pack Builder →</a></div>}</section>
    <section className="script-inventory"><header className="section-header"><div><span className="eyebrow">Reviewed knowledge structures</span><h2>Illness-script shelf</h2></div><a href="/diagnostic-reasoning">Open differential trainer →</a></header><div>{scripts.map((script) => <article key={script.id}><header><div><span>Illness script</span><h3>{script.title}</h3></div><b className={`source-decision is-${script.status}`}>{script.status.replaceAll("_", " ")}</b></header><div>{fieldDefinitions.map(([key, label]) => <span className={script.script.fields[key] ? "is-filled" : ""} key={key}><i>{script.script.fields[key] ? "✓" : "○"}</i><b>{label}</b><small>{script.script.evidence[key]?.replaceAll("_", " ")}</small></span>)}</div><label><span>Reviewer note</span><textarea value={notes[script.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [script.id]: event.target.value }))} /></label><footer><button type="button" onClick={() => editScript(script)}>Edit draft</button><button type="button" onClick={() => review(script, "changes_requested")}>Request changes</button><button type="button" onClick={() => review(script, "approved")}>Approve script</button></footer></article>)}{!scripts.length ? <p className="script-empty-message">No illness script has been saved yet.</p> : null}</div></section>
    {message ? <p className="script-message" role="status">{message}</p> : null}
  </div>;
}
