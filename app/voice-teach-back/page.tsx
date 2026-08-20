import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { VoiceTeachBackWorkspace } from "./voice-teach-back-workspace";

export const metadata: Metadata = { title: "Voice Teach-back · Poh-tah-toh", description: "Explain a source-grounded mechanism aloud and schedule correction for missing reasoning links." };

export default function VoiceTeachBackPage() {
  return <VitaeFrame active="practice" title="Voice teach-back" subtitle="Speak · Detect · Correct"><VoiceTeachBackWorkspace /></VitaeFrame>;
}
