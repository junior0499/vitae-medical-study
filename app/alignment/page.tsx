import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { AlignmentWorkspace } from "./alignment-workspace";

export const metadata: Metadata = {
  title: "Book–Syllabus Alignment · Poh-tah-toh",
  description: "See which verified textbook chapters support every Internal Medicine syllabus topic.",
};

export default function AlignmentPage() {
  return (
    <VitaeFrame active="alignment" title="Book–syllabus alignment" subtitle="Internal Medicine · Source map">
      <AlignmentWorkspace />
    </VitaeFrame>
  );
}
