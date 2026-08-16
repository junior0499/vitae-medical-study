import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { LearningGraphWorkspace } from "./learning-graph-workspace";

export const metadata: Metadata = { title: "Unified Learning Graph · Poh-tah-toh", description: "See how syllabus, sources, lessons, application, correction, and mastery connect." };

export default function LearningGraphPage() {
  return <VitaeFrame active="path" title="Unified Learning Graph" subtitle="Objective → Evidence → Mastery"><LearningGraphWorkspace /></VitaeFrame>;
}

