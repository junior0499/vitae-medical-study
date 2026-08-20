export type OfflinePack = { id: string; kind: "subject" | "system" | "exam"; title: string; detail: string; urls: string[] };

export const offlinePacks: OfflinePack[] = [
  { id: "internal-medicine", kind: "subject", title: "Internal Medicine", detail: "Clinical pathways, cardiovascular lessons, encounters, voice teach-back, outcomes, reasoning, and mistakes.", urls: ["/learn", "/cardiovascular-pathway", "/routes", "/coverage", "/learning-graph", "/cases", "/clinical-encounter", "/voice-teach-back", "/outcomes", "/mastery-proof", "/reasoning-ladder", "/misconceptions", "/learn/cardiovascular/cardiac-cycle", "/learn/cardiovascular/cardiac-output", "/mistakes", "/maps", "/note-workspace"] },
  { id: "perioperative", kind: "subject", title: "Perioperative Medicine", detail: "Mapped objectives, visual concepts, viva practice, and case reasoning.", urls: ["/learn", "/coverage", "/alignment", "/visual-lab", "/viva", "/cases", "/reasoning-ladder"] },
  { id: "women-child", kind: "subject", title: "Women & Child Health", detail: "Objective routes, clinical cases, viva, recall, and confidence review.", urls: ["/learn", "/coverage", "/routes", "/cases", "/viva", "/review", "/confidence"] },
  { id: "cardiovascular", kind: "system", title: "Cardiovascular", detail: "Cardiac cycle, output, encounter, voice teach-back, real outcomes, mastery proof, and recall.", urls: ["/cardiovascular-pathway", "/learn/cardiovascular/cardiac-cycle", "/learn/cardiovascular/cardiac-output", "/clinical-encounter", "/voice-teach-back", "/outcomes", "/mastery-proof", "/reasoning-ladder", "/visual-lab", "/review", "/maps", "/note-workspace"] },
  { id: "respiratory-renal", kind: "system", title: "Respiratory & Renal", detail: "Syllabus routes, coverage checks, cases, reasoning, and misconception repair.", urls: ["/coverage", "/routes", "/cases", "/reasoning-ladder", "/misconceptions", "/learning-graph"] },
  { id: "exam-sprint", kind: "exam", title: "Exam sprint", detail: "Assessment, spaced recall, voice teach-back, outcomes, strict proof, item quality, viva, and timed practice.", urls: ["/today", "/practice", "/assessment", "/review", "/mistakes", "/question-studio", "/question-quality", "/mastery-proof", "/viva", "/voice-teach-back", "/outcomes", "/interleaved", "/confidence", "/exam-blueprint"] },
  { id: "source-review", kind: "exam", title: "Source review", detail: "Evidence freshness, saved note links, maps, history, and private source workspaces.", urls: ["/evidence-governance", "/note-workspace", "/maps", "/history", "/source-search", "/source-compare", "/library", "/study-tools"] },
];

export function getOfflinePackUrls(ids: string[]) {
  const required = ["/", "/offline", "/study-tools"];
  return Array.from(new Set([...required, ...offlinePacks.filter((pack) => ids.includes(pack.id)).flatMap((pack) => pack.urls)]));
}
