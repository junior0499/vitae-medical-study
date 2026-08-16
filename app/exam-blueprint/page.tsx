import { VitaeFrame } from "@/components/vitae-frame";
import { ExamBlueprintWorkspace } from "./exam-blueprint-workspace";

export const metadata = { title: "Exam Blueprint · Poh-tah-toh", description: "Connect Semester 7 objectives to assessment formats and study readiness." };

export default function ExamBlueprintPage() {
  return <VitaeFrame active="practice" title="Exam blueprint" subtitle="Practice · Objective to assessment"><ExamBlueprintWorkspace /></VitaeFrame>;
}
