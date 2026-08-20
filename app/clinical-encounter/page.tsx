import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { ClinicalEncounterWorkspace } from "./clinical-encounter-workspace";

export const metadata: Metadata = { title: "Clinical Encounter Simulator · Poh-tah-toh", description: "Practise a six-stage, source-bounded cardiovascular encounter." };

export default function ClinicalEncounterPage() {
  return <VitaeFrame active="path" title="Clinical encounter" subtitle="Observe · Decide · Stop safely"><ClinicalEncounterWorkspace /></VitaeFrame>;
}

