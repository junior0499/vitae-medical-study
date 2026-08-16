import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { CoverageWorkspace } from "./coverage-workspace";

export const metadata: Metadata = {
  title: "Syllabus Coverage · Vitae",
  description: "Track every Semester 7 clinical objective from source mapping to lesson and review.",
};

export default function CoveragePage() {
  return <VitaeFrame active="coverage" title="Syllabus coverage" subtitle="Semester 7 · Mastery map"><CoverageWorkspace /></VitaeFrame>;
}
