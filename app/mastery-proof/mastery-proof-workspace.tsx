"use client";

import { useEffect, useState } from "react";

type Topic = { slug: string; title: string; href: string; state: string; passedCount: number; openMistakes: number; gates: Array<{ key: string; label: string; passed: boolean; evidence: string }> };

export function MasteryProofWorkspace() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mastered, setMastered] = useState(0);
  useEffect(() => { let active = true; fetch("/api/mastery").then((response) => response.ok ? response.json() : null).then((data) => { if (!active || !data?.strictProof) return; setTopics(data.strictProof.topics ?? []); setMastered(data.strictProof.masteredCount ?? 0); }).catch(() => undefined); return () => { active = false; }; }, []);
  return <div className="proof-page"><header className="proof-hero"><div><span className="eyebrow"><i /> Recommendation 47 · Strict mastery proof</span><h1>Mastered means<br />it survives four tests.</h1><p>A high score alone is not enough. Poh-tah-toh requires retrieval, a no-options explanation, clinical application, and successful recall after at least seven days—with no open correction.</p><a className="primary-button primary-button--dark" href="/cardiovascular-pathway">Continue cardiovascular pathway <span>→</span></a></div><div><strong>{mastered}/2</strong><span>topics strictly mastered</span><p>Unfamiliar → familiar → building → fragile → mastered</p></div></header>
    <section className="proof-rules"><article><span>01</span><strong>Recall</strong><p>Retrieve the fact or mechanism without merely rereading it.</p></article><article><span>02</span><strong>Explain</strong><p>Pass a source-trailed Professor Mode teach-back without answer options.</p></article><article><span>03</span><strong>Apply</strong><p>Use the idea correctly in a case, visual lab, or branching encounter.</p></article><article><span>04</span><strong>Retain</strong><p>Score at least 75% again after a real seven-day interval.</p></article></section>
    <section className="proof-topics"><header className="section-header"><div><span className="eyebrow">Current proof</span><h2>Cardiovascular foundations</h2></div><span>No shortcuts</span></header><div>{topics.map((topic) => <article key={topic.slug}><header><div><span>{topic.passedCount}/4 gates</span><h3>{topic.title}</h3></div><b className={`proof-state proof-state--${topic.state}`}>{topic.state}</b></header><div>{topic.gates.map((gate) => <span className={gate.passed ? "is-passed" : ""} key={gate.key}><i>{gate.passed ? "✓" : "○"}</i><strong>{gate.label}</strong><small>{gate.evidence}</small></span>)}</div>{topic.openMistakes ? <p>{topic.openMistakes} open correction{topic.openMistakes === 1 ? "" : "s"} keep this topic fragile.</p> : null}<footer><a href={topic.href}>Open lesson →</a><a href="/clinical-encounter">Apply in encounter →</a></footer></article>)}{!topics.length ? <p className="proof-loading">Calculating your four-part evidence…</p> : null}</div></section></div>;
}

