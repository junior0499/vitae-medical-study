import { VitaeFrame } from "@/components/vitae-frame";
import { ConnectedNoteWorkspace } from "./connected-note-workspace";

export const metadata = { title: "Connected Notes · Poh-tah-toh", description: "Connect notes and mind-map nodes to objectives, exact sources, approved questions, and mistakes." };

export default function ConnectedNotesPage() {
  return <VitaeFrame active="archive" title="Connected notes" subtitle="Study tools · Evidence workspace"><ConnectedNoteWorkspace /></VitaeFrame>;
}
