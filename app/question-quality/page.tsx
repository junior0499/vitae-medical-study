import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { QuestionQualityWorkspace } from "./question-quality-workspace";

export const metadata: Metadata = { title: "Question-quality Laboratory · Poh-tah-toh", description: "Inspect personal item signals and retire flawed questions through human review." };

export default function QuestionQualityPage() {
  return <VitaeFrame active="practice" title="Question-quality lab" subtitle="Measure · Review · Retire"><QuestionQualityWorkspace /></VitaeFrame>;
}

