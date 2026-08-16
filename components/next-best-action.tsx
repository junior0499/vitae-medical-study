"use client";

import { useEffect, useState } from "react";

type Recommendation = { kind: string; eyebrow: string; title: string; reason: string; href: string; action: string };

const startingRecommendation: Recommendation = {
  kind: "diagnostic", eyebrow: "Adaptive next step", title: "Take the cardiovascular diagnostic",
  reason: "Create a starting score so Poh-tah-toh can prioritize foundations from evidence instead of guessing.", href: "/diagnostic", action: "Start diagnostic",
};

export function NextBestAction() {
  const [recommendation, setRecommendation] = useState(startingRecommendation);
  useEffect(() => {
    let active = true;
    fetch("/api/learning-engine").then((response) => response.ok ? response.json() : null).then((data) => {
      if (active && data?.recommendation) setRecommendation(data.recommendation);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  return <section className={`next-best-action next-best-action--${recommendation.kind}`} aria-labelledby="next-best-action-title"><span aria-hidden="true">✦</span><div><small>{recommendation.eyebrow}</small><h2 id="next-best-action-title">{recommendation.title}</h2><p>{recommendation.reason}</p></div><a href={recommendation.href}>{recommendation.action} <span>→</span></a></section>;
}

