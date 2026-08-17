import { VitaeFrame } from "@/components/vitae-frame";
import { SourceCompareWorkspace } from "./source-compare-workspace";

export const metadata = { title: "Cross-book Comparison · Poh-tah-toh", description: "Compare exact passages from two approved medical books and review possible disagreements safely." };

export default function SourceComparePage() {
  return <VitaeFrame active="library" title="Cross-book comparison" subtitle="Learn · Recommendation 35"><SourceCompareWorkspace /></VitaeFrame>;
}
