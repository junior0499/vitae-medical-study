import { VitaeFrame } from "@/components/vitae-frame";
import { HistoryWorkspace } from "./history-workspace";

export const metadata = { title: "Learning History · Poh-tah-toh", description: "Review and safely restore saved learning versions." };

export default function HistoryPage() {
  return <VitaeFrame active="archive" title="Learning history" subtitle="Study tools · Version and rollback"><HistoryWorkspace /></VitaeFrame>;
}
