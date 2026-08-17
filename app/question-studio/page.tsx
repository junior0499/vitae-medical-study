import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { QuestionStudioWorkspace } from "./question-studio-workspace";

export const metadata: Metadata = {
  title: "Approved-source Question Studio · Poh-tah-toh",
  description: "Create and review MCQ, SAQ, viva, and clinical-case drafts anchored to exact approved source passages.",
};

export default function QuestionStudioPage() {
  return <VitaeFrame active="practice" title="Question studio" subtitle="Approved sources · Human review"><QuestionStudioWorkspace /></VitaeFrame>;
}
