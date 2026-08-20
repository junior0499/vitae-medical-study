import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { CardiovascularPathwayWorkspace } from "./pathway-workspace";

export const metadata: Metadata = {
  title: "Cardiovascular Pathway · Poh-tah-toh",
  description: "A complete cardiovascular learning route with prerequisites, adaptive Professor Mode, and cumulative progress testing.",
};

export default function CardiovascularPathwayPage() {
  return <VitaeFrame active="path" title="Cardiovascular Pathway" subtitle="Internal Medicine I · Gold-standard subject"><CardiovascularPathwayWorkspace /></VitaeFrame>;
}
