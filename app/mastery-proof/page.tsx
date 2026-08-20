import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { MasteryProofWorkspace } from "./mastery-proof-workspace";

export const metadata: Metadata = { title: "Strict Mastery Proof · Poh-tah-toh", description: "Mastery requires recall, explanation, application, and delayed retention." };

export default function MasteryProofPage() {
  return <VitaeFrame active="learn" title="Strict mastery proof" subtitle="Recall · Explain · Apply · Retain"><MasteryProofWorkspace /></VitaeFrame>;
}

