import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { DailyQueueWorkspace } from "./daily-queue-workspace";

export const metadata: Metadata = {
  title: "Today’s Learning Queue · Poh-tah-toh",
  description: "A daily medical-learning queue selected from weaknesses, due recall, mistakes, lessons, and revision evidence.",
};

export default function TodayPage() {
  return <VitaeFrame active="today" title="Today’s queue" subtitle="Adaptive plan · India time"><DailyQueueWorkspace /></VitaeFrame>;
}
