import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { LearnHub } from "./learn-hub";

export const metadata: Metadata = {
  title: "Clinical Subjects · Vitae",
  description: "Study Semester 7 by clinical subject, system, and foundation lesson.",
};

export default function LearnPage() {
  return (
    <VitaeFrame active="learn" title="Clinical subjects" subtitle="Learn · Semester 7">
      <LearnHub />
    </VitaeFrame>
  );
}
