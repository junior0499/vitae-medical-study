import { VitaeFrame } from "@/components/vitae-frame";
import { VivaWorkspace } from "./viva-workspace";

export const metadata = { title: "Oral Viva · Poh-tah-toh", description: "A source-grounded oral viva for cardiovascular foundations." };

export default function VivaPage() {
  return <VitaeFrame active="practice" title="Oral viva" subtitle="Practice · Speak and explain"><VivaWorkspace /></VitaeFrame>;
}
