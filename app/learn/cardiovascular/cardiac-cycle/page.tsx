import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { LessonWorkspace } from "./lesson-workspace";

export const metadata: Metadata = {
  title: "The Cardiac Cycle · Poh-tah-toh",
  description: "A paced, visual Professor Mode lesson on the cardiac cycle.",
};

export default function CardiacCyclePage() {
  return (
    <VitaeFrame active="learn" title="The cardiac cycle" subtitle="Cardiovascular · Foundation 04">
      <LessonWorkspace />
    </VitaeFrame>
  );
}
