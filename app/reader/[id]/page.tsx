import { VitaeFrame } from "@/components/vitae-frame";
import { SourceReaderWorkspace } from "./source-reader-workspace";

export const metadata = { title: "Linked Source Reader · Poh-tah-toh", description: "Read, highlight, and cite a private indexed source section." };

export default async function SourceReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VitaeFrame active="library" title="Linked source reader" subtitle="Learn · Read · Cite"><SourceReaderWorkspace documentId={id} /></VitaeFrame>;
}
