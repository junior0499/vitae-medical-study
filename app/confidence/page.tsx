import { VitaeFrame } from "@/components/vitae-frame";
import { ConfidenceWorkspace } from "./confidence-workspace";

export const metadata = { title: "Confidence Calibration · Poh-tah-toh", description: "Compare answer accuracy with confidence to find hidden learning risk." };

export default function ConfidencePage() {
  return <VitaeFrame active="practice" title="Confidence calibration" subtitle="Practice · Accuracy versus certainty"><ConfidenceWorkspace /></VitaeFrame>;
}
