import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { subjectRoutes } from "@/lib/learning-routes";

export const metadata: Metadata = {
  title: "Clinical Learning Routes · Poh-tah-toh",
  description: "Foundation-first learning sequences for every Semester 7 clinical subject.",
};

const statusLabels = { live: "Lessons live", mapped: "Source mapped", source_needed: "Source needed" };

export default function RoutesPage() {
  return <VitaeFrame active="learn" title="Clinical Learning Routes" subtitle="Subject → Foundation → Clinical reasoning"><div className="routes-page">
    <header className="routes-hero"><div><span className="eyebrow"><i /> Subject-specific sequence</span><h1>Know what comes next,<br />and why it comes next.</h1><p>Each route keeps prerequisites before disease and keeps unavailable lessons visibly source-gated.</p></div><a className="primary-button primary-button--dark" href="/coverage">Check source readiness <span>→</span></a></header>
    <section className="route-subjects" aria-label="Subject learning routes">{subjectRoutes.map((route) => <article key={route.id}><header><span>{route.code}</span><div><small>Semester 7 route</small><h2>{route.subject}</h2><p>{route.principle}</p></div></header><ol>{route.steps.map((step, index) => <li className={`route-step route-step--${step.status}`} key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{step.title}</strong><p>{step.purpose}</p><small>{statusLabels[step.status]}</small></div>{step.href ? <a href={step.href} aria-label={`Open ${step.title}`}>→</a> : null}</li>)}</ol></article>)}</section>
  </div></VitaeFrame>;
}
