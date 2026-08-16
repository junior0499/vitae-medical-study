"use client";

import { useEffect, useState } from "react";

type Mastery = { score: number; level: string; evidence: { completedLessons: number; questionsAnswered: number; reviewCards: number } };

export function MasteryMeter() {
  const [mastery, setMastery] = useState<Mastery | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/mastery").then((response) => response.ok ? response.json() : null).then((data) => { if (active && data?.score !== undefined) setMastery(data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const score = mastery?.score ?? 0;
  return <div className="semester-card">
    <span>Evidence-based mastery</span><strong>{mastery?.level ?? "Starting"}</strong>
    <div><i style={{ width: `${score}%` }} /><b>{score}%</b></div>
    <small>{mastery ? `${mastery.evidence.completedLessons} lessons · ${mastery.evidence.questionsAnswered} answers · ${mastery.evidence.reviewCards} reviews` : "Calculating from your learning evidence…"}</small>
  </div>;
}
