import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { EvidenceGovernanceWorkspace } from "./evidence-governance-workspace";

export const metadata: Metadata = { title: "Evidence Freshness · Poh-tah-toh", description: "Review source editions, dates, conflicts, and re-review status without automatic clinical rewrites." };

export default function EvidenceGovernancePage() {
  return <VitaeFrame active="library" title="Evidence freshness" subtitle="Review · Date · Preserve"><EvidenceGovernanceWorkspace /></VitaeFrame>;
}

