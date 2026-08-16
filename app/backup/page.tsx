import { VitaeFrame } from "@/components/vitae-frame";
import { BackupWorkspace } from "./backup-workspace";

export const metadata = { title: "Private Backup · Poh-tah-toh", description: "Export private structured study data as one archive." };

export default function BackupPage() {
  return <VitaeFrame active="archive" title="Private backup" subtitle="Study tools · Export workspace"><BackupWorkspace /></VitaeFrame>;
}
