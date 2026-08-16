import { VitaeFrame } from "@/components/vitae-frame";
import { InterleavedWorkspace } from "./interleaved-workspace";

export const metadata = { title: "Interleaved Review · Poh-tah-toh", description: "A mixed cardiovascular review with confidence calibration." };

export default function InterleavedPage() {
  return <VitaeFrame active="practice" title="Interleaved review" subtitle="Practice · Mix related topics"><InterleavedWorkspace /></VitaeFrame>;
}
