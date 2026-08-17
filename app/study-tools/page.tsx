import { VitaeFrame } from "@/components/vitae-frame";

export const metadata = { title: "Study Tools · Poh-tah-toh", description: "Deep approved-source search, linked reading, citation-first teaching, history, and private backup." };

const tools = [
  { number: "23", title: "Smart source search", detail: "Search only uploaded book sections still attached to approved mappings, then open the chapter or saved page range.", href: "/source-search", action: "Search approved sources" },
  { number: "24", title: "Learning history", detail: "Review saved versions of notes, mind maps, mapping decisions, and lesson drafts with recoverable rollback.", href: "/history", action: "Open version history" },
  { number: "25", title: "Private backup", detail: "Download every structured learning record and source-file reference as one owner-scoped JSON archive.", href: "/backup", action: "Prepare backup" },
  { number: "26", title: "Deep PDF & Word search", detail: "Extract text and use on-device OCR for small scanned sections, then search approved passages by page.", href: "/source-search", action: "Search inside sources" },
  { number: "27", title: "Source-linked reader", detail: "Read indexed pages, highlight exact passages, and attach the page citation directly to lesson notes.", href: "/library", action: "Open source library" },
  { number: "28", title: "Citation-first Professor", detail: "Place approved extracted evidence before teaching and keep every explanation or later connection visibly labeled.", href: "/learn/cardiovascular/cardiac-cycle", action: "Open Professor Mode" },
];

export default function StudyToolsPage() {
  return <VitaeFrame active="archive" title="Study tools" subtitle="Learn · Features 23–28"><div className="study-tools-page"><header className="study-tools-hero"><div><span className="eyebrow"><i /> Find · read · cite · recover · protect</span><h1>Your sources and work<br />stay under your control.</h1><p>Search only reviewed source routes, read the exact passage beside a lesson, separate evidence from explanation, recover earlier versions, and carry a private backup.</p><a className="primary-button primary-button--dark" href="/source-search">Search approved passages <span>→</span></a></div><div><strong>6</strong><span>private learning safeguards</span><p>Each operation remains restricted to the signed-in owner.</p></div></header><section className="study-tool-grid">{tools.map((tool) => <a href={tool.href} key={tool.number}><span>{tool.number}</span><small>Recommendation {tool.number}</small><strong>{tool.title}</strong><p>{tool.detail}</p><b>{tool.action} →</b></a>)}</section><aside className="study-tools-rule"><span>⌁</span><div><strong>Source files remain private and separate.</strong><p>Text and OCR extraction happens on your device, indexed passages remain owner-scoped, and original textbook bytes are never exposed in structured exports.</p></div><a href="/library">Open library</a></aside></div></VitaeFrame>;
}
