import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { IllnessScriptWorkspace } from "./illness-script-workspace";

export const metadata: Metadata = { title: "Illness Script Builder · Poh-tah-toh", description: "Build reviewed illness scripts from approved source learning packs." };

export default function IllnessScriptsPage() {
  return <VitaeFrame active="learn" title="Illness Script Builder" subtitle="Structure · Source · Review"><IllnessScriptWorkspace /></VitaeFrame>;
}
