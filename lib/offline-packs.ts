export type OfflinePack = { id: string; kind: "subject" | "system" | "exam"; title: string; detail: string; urls: string[] };

export const offlinePacks: OfflinePack[] = [
  { id: "internal-medicine", kind: "subject", title: "Internal Medicine", detail: "Clinical pathways, cardiovascular lessons, cases, reasoning, and mistakes.", urls: ["/learn", "/cardiovascular-pathway", "/routes", "/coverage", "/learning-graph", "/cases", "/reasoning-ladder", "/misconceptions", "/learn/cardiovascular/cardiac-cycle", "/learn/cardiovascular/cardiac-output", "/mistakes", "/maps", "/note-workspace"] },
  { id: "perioperative", kind: "subject", title: "Perioperative Medicine", detail: "Mapped objectives, visual concepts, viva practice, and case reasoning.", urls: ["/learn", "/coverage", "/alignment", "/visual-lab", "/viva", "/cases", "/reasoning-ladder"] },
  { id: "women-child", kind: "subject", title: "Women & Child Health", detail: "Objective routes, clinical cases, viva, recall, and confidence review.", urls: ["/learn", "/coverage", "/routes", "/cases", "/viva", "/review", "/confidence"] },
  { id: "cardiovascular", kind: "system", title: "Cardiovascular", detail: "Cardiac cycle, cardiac output, adaptive Professor Mode, progress testing, visual lab, and recall.", urls: ["/cardiovascular-pathway", "/learn/cardiovascular/cardiac-cycle", "/learn/cardiovascular/cardiac-output", "/reasoning-ladder", "/visual-lab", "/review", "/maps", "/note-workspace"] },
  { id: "respiratory-renal", kind: "system", title: "Respiratory & Renal", detail: "Syllabus routes, coverage checks, cases, reasoning, and misconception repair.", urls: ["/coverage", "/routes", "/cases", "/reasoning-ladder", "/misconceptions", "/learning-graph"] },
  { id: "exam-sprint", kind: "exam", title: "Exam sprint", detail: "Assessment, spaced recall, mistakes, viva, blueprint, and timed practice screens.", urls: ["/today", "/practice", "/assessment", "/review", "/mistakes", "/question-studio", "/viva", "/interleaved", "/confidence", "/exam-blueprint"] },
  { id: "source-review", kind: "exam", title: "Source review", detail: "Saved note links, maps, history, and private source workspace shells.", urls: ["/note-workspace", "/maps", "/history", "/source-search", "/source-compare", "/library", "/study-tools"] },
];

export function getOfflinePackUrls(ids: string[]) {
  const required = ["/", "/offline", "/study-tools"];
  return Array.from(new Set([...required, ...offlinePacks.filter((pack) => ids.includes(pack.id)).flatMap((pack) => pack.urls)]));
}
