import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { DiagnosticWorkspace } from "./diagnostic-workspace";

export const metadata: Metadata = { title: "Starting Diagnostic · Poh-tah-toh", description: "Find the right cardiovascular starting point from source-trailed evidence." };

export default function DiagnosticPage() {
  return <VitaeFrame active="path" title="Starting Diagnostic" subtitle="Measure → Prioritize → Learn"><DiagnosticWorkspace /></VitaeFrame>;
}

