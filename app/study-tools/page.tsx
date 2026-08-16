import { VitaeFrame } from "@/components/vitae-frame";

export const metadata = { title: "Study Tools · Poh-tah-toh", description: "Approved-source search, learning history, and private backup." };

const tools = [
  { number: "23", title: "Smart source search", detail: "Search only uploaded book sections still attached to approved mappings, then open the chapter or saved page range.", href: "/source-search", action: "Search approved sources" },
  { number: "24", title: "Learning history", detail: "Review saved versions of notes, mind maps, mapping decisions, and lesson drafts with recoverable rollback.", href: "/history", action: "Open version history" },
  { number: "25", title: "Private backup", detail: "Download every structured learning record and source-file reference as one owner-scoped JSON archive.", href: "/backup", action: "Prepare backup" },
];

export default function StudyToolsPage() {
  return <VitaeFrame active="archive" title="Study tools" subtitle="Learn · Features 23–25"><div className="study-tools-page"><header className="study-tools-hero"><div><span className="eyebrow"><i /> Find · recover · protect</span><h1>Your sources and work<br />stay under your control.</h1><p>Search only reviewed source routes, recover earlier learning versions, and carry a private backup of the structured workspace.</p><a className="primary-button primary-button--dark" href="/source-search">Search approved sources <span>→</span></a></div><div><strong>3</strong><span>private workspace safeguards</span><p>Each operation remains restricted to the signed-in owner.</p></div></header><section className="study-tool-grid">{tools.map((tool) => <a href={tool.href} key={tool.number}><span>{tool.number}</span><small>Recommendation {tool.number}</small><strong>{tool.title}</strong><p>{tool.detail}</p><b>{tool.action} →</b></a>)}</section><aside className="study-tools-rule"><span>⌁</span><div><strong>Source files remain private and separate.</strong><p>Search and backup use approved metadata and owner-scoped records. Original textbook file bytes are never exposed in the structured export.</p></div><a href="/library">Open library</a></aside></div></VitaeFrame>;
}
