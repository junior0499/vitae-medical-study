import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { AssessmentWorkspace } from "./assessment-workspace";

export const metadata: Metadata = {
  title: "Clinical Assessment Centre · Poh-tah-toh",
  description: "Practise source-trailed MCQs, SAQs, Mini-OSCEs, clinical cases, and timed foundation checks.",
};

export default function AssessmentPage() {
  return <VitaeFrame active="assessment" title="Clinical Assessment Centre" subtitle="Practice · Apply · Correct"><AssessmentWorkspace /></VitaeFrame>;
}
