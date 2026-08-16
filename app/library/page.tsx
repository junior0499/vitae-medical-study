import type { Metadata } from "next";
import { VitaeFrame } from "@/components/vitae-frame";
import { LibraryWorkspace } from "./library-workspace";

export const metadata: Metadata = {
  title: "Source Library · Poh-tah-toh",
  description: "Organize medical syllabi, textbooks and lecture notes by semester and subject.",
};

export default function LibraryPage() {
  return (
    <VitaeFrame active="library" title="Source library" subtitle="Your private medical library">
      <LibraryWorkspace />
    </VitaeFrame>
  );
}
