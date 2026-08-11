import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { LearnHub } from "./learn-hub";

export const metadata: Metadata = {
  title: "Clinical Foundations · Vitae",
  description: "Build medical foundations system by system before moving into disease.",
};

export default function LearnPage() {
  return (
    <VitaeFrame active="learn" title="Clinical foundations" subtitle="Learn · Semester 7">
      <LearnHub />
    </VitaeFrame>
  );
}
