import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { VisualLabWorkspace } from "./visual-lab-workspace";

export const metadata: Metadata = { title: "Visual Interpretation Lab · Poh-tah-toh", description: "Interpret source-grounded pressure and cardiac-output patterns." };

export default function VisualLabPage() {
  return <VitaeFrame active="path" title="Visual Interpretation Lab" subtitle="See → Interpret → Explain"><VisualLabWorkspace /></VitaeFrame>;
}

