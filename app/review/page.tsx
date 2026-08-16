import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { ReviewWorkspace } from "./review-workspace";

export const metadata: Metadata = {
  title: "Smart Review Queue · Poh-tah-toh",
  description: "A private spaced-repetition queue built from Professor Mode recall questions.",
};

export default function ReviewPage() {
  return <VitaeFrame active="review" title="Smart review" subtitle="Recall · Due cards"><ReviewWorkspace /></VitaeFrame>;
}
