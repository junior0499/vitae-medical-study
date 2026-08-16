import { VitaeFrame } from "@/components/vitae-frame";

export const metadata = { title: "Practice Studio · Poh-tah-toh", description: "Viva, comparison, interleaving, confidence, and exam-planning tools." };

const tools = [
  { number: "18", title: "Oral viva mode", detail: "Answer aloud or by typing, request a hint, then compare with a source-grounded response.", href: "/viva", tag: "Speak & explain" },
  { number: "19", title: "Normal vs disease", detail: "Trace the physiology change first; clinical layers unlock only when sources support them.", href: "/comparisons", tag: "Compare mechanisms" },
  { number: "20", title: "Interleaved review", detail: "Switch between cardiac-cycle and cardiac-output questions instead of repeating one block.", href: "/interleaved", tag: "Mix topics" },
  { number: "21", title: "Confidence calibration", detail: "Find confident-but-incorrect concepts and uncertain answers that were actually correct.", href: "/confidence", tag: "Measure certainty" },
  { number: "22", title: "Exam blueprint", detail: "Connect all 68 objectives to MCQ, SAQ, OSCE, and viva planning lanes.", href: "/exam-blueprint", tag: "Plan assessment" },
];

export default function PracticePage() {
  return <VitaeFrame active="practice" title="Practice studio" subtitle="Learn · Features 18–22"><div className="practice-page"><header className="practice-hero"><div><span className="eyebrow"><i /> Connected practice</span><h1>Explain it. Mix it.<br />Know how sure you are.</h1><p>Five practice modes now extend the learning loop without bypassing source approval. Begin with the active physiology lessons, then unlock clinical detail as your library grows.</p><a className="primary-button primary-button--dark" href="/viva">Start oral viva <span>→</span></a></div><div><strong>5</strong><span>connected practice modes</span><p>Every saved answer can influence corrections, confidence, and your next best activity.</p></div></header><section className="practice-tool-grid" aria-label="Practice modes">{tools.map((tool) => <a href={tool.href} key={tool.number}><span>{tool.number}</span><small>{tool.tag}</small><strong>{tool.title}</strong><p>{tool.detail}</p><b>Open mode →</b></a>)}</section><aside className="practice-source-rule"><span>⌁</span><div><strong>The source gate applies to practice too.</strong><p>Physiology tools are live now. Disease symptoms, investigations, and management remain marked and locked until their book sections are approved.</p></div><a href="/alignment">Review sources</a></aside></div></VitaeFrame>;
}
