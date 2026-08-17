import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { CoverageWorkspace } from "./coverage-workspace";

export const metadata: Metadata = {
  title: "Syllabus Coverage · Poh-tah-toh",
  description: "Track every Semester 7 objective through chapter, page, uploaded source, lesson, recall, questions, and remaining gaps.",
};

export default function CoveragePage() {
  return <VitaeFrame active="coverage" title="Syllabus coverage" subtitle="Semester 7 · Mastery map"><CoverageWorkspace /></VitaeFrame>;
}
