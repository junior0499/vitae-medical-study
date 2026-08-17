import { VitaeFrame } from "@/components/vitae-frame";
import { MisconceptionWorkspace } from "./misconception-workspace";

export const metadata = { title: "Misconception Detector · Poh-tah-toh", description: "Detect repeated conceptual errors and complete short source-trailed corrective lessons." };

export default function MisconceptionsPage() {
  return <VitaeFrame active="mistakes" title="Misconception detector" subtitle="Learn · Recommendation 34"><MisconceptionWorkspace /></VitaeFrame>;
}
