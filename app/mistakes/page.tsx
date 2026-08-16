import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { MistakeWorkspace } from "./mistake-workspace";

export const metadata: Metadata = {
  title: "Mistake Notebook · Vitae",
  description: "Turn incorrect answers into corrected concepts with sources and review dates.",
};

export default function MistakesPage() {
  return <VitaeFrame active="mistakes" title="Mistake Notebook" subtitle="Incorrect → Corrected → Reviewed"><MistakeWorkspace /></VitaeFrame>;
}
