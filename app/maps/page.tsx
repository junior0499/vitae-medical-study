import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { MapsWorkspace } from "./maps-workspace";

export const metadata: Metadata = {
  title: "My Sideways Maps · Poh-tah-toh",
  description: "Review connected sideways maps created from your own lesson notes.",
};

export default function MapsPage() {
  return <VitaeFrame active="learn" title="My Sideways Maps" subtitle="Your notes · Connected"><MapsWorkspace /></VitaeFrame>;
}
