import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { OfflineWorkspace } from "./offline-workspace";

export const metadata: Metadata = { title: "Offline & Travel Mode · Vitae", description: "Prepare selected medical lessons for low-connectivity study." };

export default function OfflinePage() {
  return <VitaeFrame active="learn" title="Offline & Travel Mode" subtitle="Travel light · Keep learning"><OfflineWorkspace /></VitaeFrame>;
}
