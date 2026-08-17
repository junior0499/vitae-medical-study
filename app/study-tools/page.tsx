import { VitaeFrame } from "@/components/vitae-frame";

export const metadata = { title: "Study Tools · Poh-tah-toh", description: "Objective-level coverage, adaptive daily learning, smarter memory scheduling, and approved-source question creation." };

const tools = [
  { number: "23", title: "Smart source search", detail: "Search only uploaded book sections still attached to approved mappings, then open the chapter or saved page range.", href: "/source-search", action: "Search approved sources" },
  { number: "24", title: "Learning history", detail: "Review saved versions of notes, mind maps, mapping decisions, and lesson drafts with recoverable rollback.", href: "/history", action: "Open version history" },
  { number: "25", title: "Private backup", detail: "Download every structured learning record and source-file reference as one owner-scoped JSON archive.", href: "/backup", action: "Prepare backup" },
  { number: "26", title: "Deep PDF & Word search", detail: "Extract text and use on-device OCR for small scanned sections, then search approved passages by page.", href: "/source-search", action: "Search inside sources" },
  { number: "27", title: "Source-linked reader", detail: "Read indexed pages, highlight exact passages, and attach the page citation directly to lesson notes.", href: "/library", action: "Open source library" },
  { number: "28", title: "Citation-first Professor", detail: "Place approved extracted evidence before teaching and keep every explanation or later connection visibly labeled.", href: "/learn/cardiovascular/cardiac-cycle", action: "Open Professor Mode" },
  { number: "29", title: "Objective-level coverage", detail: "Trace every syllabus objective through chapter, exact page, uploaded section, lesson, recall, questions, and visible remaining gaps.", href: "/coverage", action: "Inspect objective paths" },
  { number: "30", title: "Adaptive daily queue", detail: "Choose today’s lesson, recall, mistakes, practice, and revision from weakness, due dates, and saved learning evidence.", href: "/today", action: "Open today’s queue" },
  { number: "31", title: "Smarter spaced repetition", detail: "Adjust review intervals using accuracy, difficulty, confidence, response speed, overdue time, and personal lapse history.", href: "/review", action: "Open adaptive review" },
  { number: "32", title: "Approved-source questions", detail: "Create MCQ, SAQ, viva, and clinical-case drafts from an exact approved passage, then hold each behind human review.", href: "/question-studio", action: "Open question studio" },
];

export default function StudyToolsPage() {
  return <VitaeFrame active="archive" title="Study tools" subtitle="Learn · Features 23–32"><div className="study-tools-page"><header className="study-tools-hero"><div><span className="eyebrow"><i /> Trace · prioritize · remember · review</span><h1>Your sources now drive<br />the whole learning day.</h1><p>Trace every objective to evidence, let today’s queue prioritize weak and due work, adapt review intervals to real memory signals, and approve questions before they enter study.</p><a className="primary-button primary-button--dark" href="/today">Open today’s queue <span>→</span></a></div><div><strong>10</strong><span>connected learning safeguards</span><p>Each operation remains source-gated, reviewable, and restricted to the signed-in owner.</p></div></header><section className="study-tool-grid">{tools.map((tool) => <a href={tool.href} key={tool.number}><span>{tool.number}</span><small>Recommendation {tool.number}</small><strong>{tool.title}</strong><p>{tool.detail}</p><b>{tool.action} →</b></a>)}</section><aside className="study-tools-rule"><span>⌁</span><div><strong>Source files remain private and separate.</strong><p>Text and OCR extraction happens on your device, indexed passages remain owner-scoped, and original textbook bytes are never exposed in structured exports.</p></div><a href="/library">Open library</a></aside></div></VitaeFrame>;
}
