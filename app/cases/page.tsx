import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { CaseWorkspace } from "./case-workspace";

export const metadata: Metadata = { title: "Progressive Clinical Cases · Poh-tah-toh", description: "Apply approved cardiovascular foundations one decision at a time." };

export default function CasesPage() {
  return <VitaeFrame active="path" title="Progressive Clinical Cases" subtitle="Observe → Decide → Explain"><CaseWorkspace /></VitaeFrame>;
}

