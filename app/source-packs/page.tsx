import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { SourcePackWorkspace } from "./source-pack-workspace";

export const metadata: Metadata = { title: "Source Pack Builder · Poh-tah-toh", description: "Turn one approved book section into a reviewed, source-locked clinical learning pack." };

export default function SourcePacksPage() {
  return <VitaeFrame active="alignment" title="Source Pack Builder" subtitle="Objective · Passage · Review"><SourcePackWorkspace /></VitaeFrame>;
}
