import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { LessonWorkspace } from "./lesson-workspace";

export const metadata: Metadata = {
  title: "Cardiac Output · Poh-tah-toh",
  description: "A paced, visual Professor Mode lesson on cardiac output and stroke volume.",
};

export default function CardiacOutputPage() {
  return (
    <VitaeFrame active="learn" title="Cardiac output" subtitle="Cardiovascular · Foundation 05">
      <LessonWorkspace />
    </VitaeFrame>
  );
}
