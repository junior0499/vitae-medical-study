import { VitaeFrame } from "@/components/vitae-frame";
import { SourceSearchWorkspace } from "./source-search-workspace";

export const metadata = { title: "Approved Source Search · Poh-tah-toh", description: "Search only approved uploaded book sections." };

export default function SourceSearchPage() {
  return <VitaeFrame active="archive" title="Source search" subtitle="Study tools · Approved sections"><SourceSearchWorkspace /></VitaeFrame>;
}
