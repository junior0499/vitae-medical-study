"use client";

export type ExtractedSourcePage = { pageNumber: number; text: string };
export type SourceExtractionResult = {
  status: "ready" | "partial" | "needs_ocr" | "failed";
  method: "plain_text" | "docx_text" | "pdf_text" | "pdf_text+ocr" | "unsupported";
  pageCount: number;
  pages: ExtractedSourcePage[];
  warning: string;
};

type ProgressReporter = (message: string) => void;

const MAX_PAGES = 80;
const MAX_PAGE_CHARACTERS = 15_000;
const MAX_TOTAL_CHARACTERS = 500_000;
const OCR_PAGE_LIMIT = 10;
const OCR_FILE_LIMIT = 12 * 1024 * 1024;

function cleanText(value: string) {
  return value.split("\u0000").join("").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function chunkText(value: string) {
  const clean = cleanText(value);
  if (!clean) return [];
  const paragraphs = clean.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > 12_000) {
      chunks.push(current); current = "";
    }
    if (paragraph.length > 12_000) {
      if (current) { chunks.push(current); current = ""; }
      for (let start = 0; start < paragraph.length; start += 12_000) chunks.push(paragraph.slice(start, start + 12_000));
    } else current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current) chunks.push(current);
  return chunks.slice(0, MAX_PAGES).map((text, index) => ({ pageNumber: index + 1, text: text.slice(0, MAX_PAGE_CHARACTERS) }));
}

function capPages(pages: ExtractedSourcePage[]) {
  let used = 0;
  const capped: ExtractedSourcePage[] = [];
  for (const page of pages.slice(0, MAX_PAGES)) {
    if (used >= MAX_TOTAL_CHARACTERS) break;
    const text = cleanText(page.text).slice(0, Math.min(MAX_PAGE_CHARACTERS, MAX_TOTAL_CHARACTERS - used));
    if (text) { capped.push({ pageNumber: page.pageNumber, text }); used += text.length; }
  }
  return capped;
}

async function extractPdf(file: File, report: ProgressReporter): Promise<SourceExtractionResult> {
  report("Reading the PDF text layer…");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pageLimit = Math.min(pdf.numPages, MAX_PAGES);
  const pages: ExtractedSourcePage[] = [];
  const emptyPages: number[] = [];
  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    report(`Reading PDF page ${pageNumber} of ${pageLimit}…`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = cleanText(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    if (text.length >= 24) pages.push({ pageNumber, text });
    else emptyPages.push(pageNumber);
  }

  let ocrUsed = false;
  let ocrWarning = "";
  if (emptyPages.length && emptyPages.length <= OCR_PAGE_LIMIT && file.size <= OCR_FILE_LIMIT) {
    report(`Starting on-device OCR for ${emptyPages.length} scanned ${emptyPages.length === 1 ? "page" : "pages"}…`);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, { logger: (message) => {
        if (message.status === "recognizing text") report(`OCR ${Math.round(message.progress * 100)}%…`);
      } });
      try {
        for (const pageNumber of emptyPages) {
          const page = await pdf.getPage(pageNumber);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(1.8, 1800 / Math.max(base.width, base.height));
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, viewport }).promise;
          const result = await worker.recognize(canvas);
          const text = cleanText(result.data.text);
          if (text.length >= 24) pages.push({ pageNumber, text });
          canvas.width = 1; canvas.height = 1;
        }
        ocrUsed = true;
      } finally { await worker.terminate(); }
    } catch { ocrWarning = "Some scanned pages could not be OCR-indexed on this device."; }
  }

  const capped = capPages(pages.sort((a, b) => a.pageNumber - b.pageNumber));
  const remaining = pageLimit - capped.length;
  const truncated = pdf.numPages > MAX_PAGES;
  const warning = [
    truncated ? `Indexed the first ${MAX_PAGES} pages of this section.` : "",
    remaining ? `${remaining} ${remaining === 1 ? "page has" : "pages have"} no searchable text.` : "",
    ocrWarning,
  ].filter(Boolean).join(" ");
  return {
    status: capped.length === pageLimit && !truncated ? "ready" : capped.length ? "partial" : "needs_ocr",
    method: ocrUsed ? "pdf_text+ocr" : "pdf_text",
    pageCount: pdf.numPages,
    pages: capped,
    warning,
  };
}

async function extractDocx(file: File, report: ProgressReporter): Promise<SourceExtractionResult> {
  report("Reading the Word section…");
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const pages = capPages(chunkText(result.value));
  const warning = result.messages.map((message) => message.message).slice(0, 3).join(" ");
  return { status: pages.length ? "ready" : "failed", method: "docx_text", pageCount: pages.length, pages, warning };
}

export async function extractSourceFile(file: File, report: ProgressReporter = () => undefined): Promise<SourceExtractionResult> {
  try {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return await extractPdf(file, report);
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.toLowerCase().endsWith(".docx")) return await extractDocx(file, report);
    if (file.type === "text/plain" || file.type === "text/csv" || /\.(txt|csv)$/i.test(file.name)) {
      report("Building the text index…");
      const pages = capPages(chunkText(await file.text()));
      return { status: pages.length ? "ready" : "failed", method: "plain_text", pageCount: pages.length, pages, warning: "" };
    }
    return { status: "needs_ocr", method: "unsupported", pageCount: 0, pages: [], warning: "Legacy .doc files need to be saved as DOCX or PDF before deep indexing." };
  } catch (error) {
    return { status: "failed", method: "unsupported", pageCount: 0, pages: [], warning: error instanceof Error ? error.message.slice(0, 300) : "Text extraction failed on this device." };
  }
}
