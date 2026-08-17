import { VitaeFrame } from "@/components/vitae-frame";
import { ReasoningLadderWorkspace } from "./reasoning-ladder-workspace";

export const metadata = { title: "Clinical Reasoning Ladder · Poh-tah-toh", description: "Build a source-cited chain from normal physiology through mechanism, symptoms, examination, investigation, and management." };

export default function ReasoningLadderPage() {
  return <VitaeFrame active="practice" title="Clinical reasoning ladder" subtitle="Learn · Recommendation 33"><ReasoningLadderWorkspace /></VitaeFrame>;
}
