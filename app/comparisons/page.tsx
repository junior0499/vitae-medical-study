import { VitaeFrame } from "@/components/vitae-frame";
import { ComparisonWorkspace } from "./comparison-workspace";

export const metadata = { title: "Normal vs Disease · Poh-tah-toh", description: "Compare normal physiology with source-supported pathological change." };

export default function ComparisonsPage() {
  return <VitaeFrame active="practice" title="Normal vs disease" subtitle="Practice · Compare mechanisms"><ComparisonWorkspace /></VitaeFrame>;
}
