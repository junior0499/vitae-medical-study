import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { DiagnosticReasoningWorkspace } from "./diagnostic-reasoning-workspace";

export const metadata: Metadata = { title: "Diagnostic Reasoning Studio · Poh-tah-toh", description: "Compare approved illness scripts, score diagnostic justification, and practise counterfactual transfer." };

export default function DiagnosticReasoningPage() {
  return <VitaeFrame active="practice" title="Diagnostic reasoning studio" subtitle="Compare · Justify · Transfer"><DiagnosticReasoningWorkspace /></VitaeFrame>;
}
