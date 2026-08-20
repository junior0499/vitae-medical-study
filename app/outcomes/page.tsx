import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { OutcomesWorkspace } from "./outcomes-workspace";

export const metadata: Metadata = { title: "Learning Outcomes · Poh-tah-toh", description: "Measure delayed retention, unfamiliar-case performance, confidence accuracy, and weak prerequisites." };

export default function OutcomesPage() {
  return <VitaeFrame active="learn" title="Learning outcomes" subtitle="Retain · Transfer · Calibrate"><OutcomesWorkspace /></VitaeFrame>;
}
