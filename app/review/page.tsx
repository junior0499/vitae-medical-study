import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { ReviewWorkspace } from "./review-workspace";

export const metadata: Metadata = {
  title: "Smart Review Queue · Poh-tah-toh",
  description: "A private review queue adapted to accuracy, difficulty, confidence, response speed, due time, and lapse history.",
};

export default function ReviewPage() {
  return <VitaeFrame active="review" title="Smart review" subtitle="Recall · Due cards"><ReviewWorkspace /></VitaeFrame>;
}
