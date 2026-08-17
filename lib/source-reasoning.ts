export const reasoningStages = [
  { key: "normal", label: "Normal physiology", shortLabel: "Normal", prompt: "What normally happens, and what is its purpose?", keywords: ["normal", "physiology", "physiological", "function", "healthy", "regulation", "maintain"] },
  { key: "mechanism", label: "Abnormal mechanism", shortLabel: "Mechanism", prompt: "What changes first, and how does that disturb normal function?", keywords: ["mechanism", "pathogenesis", "abnormal", "dysfunction", "impaired", "failure", "increase", "decrease", "obstruction", "injury"] },
  { key: "symptoms", label: "Symptoms", shortLabel: "Symptoms", prompt: "How would the altered mechanism be experienced by the patient?", keywords: ["symptom", "symptoms", "presents", "presentation", "complaint", "pain", "dyspnea", "fatigue", "cough", "edema"] },
  { key: "examination", label: "Examination", shortLabel: "Examination", prompt: "Which physical findings would connect back to the mechanism?", keywords: ["examination", "physical", "finding", "findings", "sign", "signs", "auscultation", "palpation", "inspection", "murmur"] },
  { key: "investigation", label: "Investigation", shortLabel: "Investigation", prompt: "Which test would demonstrate or quantify the suspected change?", keywords: ["investigation", "diagnosis", "diagnostic", "test", "laboratory", "imaging", "ecg", "echocardiography", "radiograph", "measurement"] },
  { key: "management", label: "Management", shortLabel: "Management", prompt: "Which source-backed action addresses the mechanism or its consequences?", keywords: ["management", "treatment", "therapy", "therapeutic", "intervention", "recommended", "prevention", "drug", "surgery", "monitoring"] },
] as const;

export type ReasoningStageKey = typeof reasoningStages[number]["key"];

export type SourceChunkInput = {
  documentId: string;
  pageNumber: number;
  printedPage: string;
  textContent: string;
};

export type SourceDescriptor = {
  documentId: string;
  label: string;
};

const stopWords = new Set(["about", "after", "again", "against", "because", "before", "being", "between", "could", "during", "every", "first", "from", "have", "into", "more", "other", "patient", "should", "their", "there", "these", "this", "those", "through", "under", "using", "which", "while", "with", "would"]);

export function normalizeSourceText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sourceTerms(value: string) {
  return Array.from(new Set((value.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []).filter((word) => !stopWords.has(word))));
}

function sourceSentences(value: string) {
  return normalizeSourceText(value).split(/(?<=[.!?])\s+/).map(normalizeSourceText).filter((sentence) => sentence.length >= 40 && sentence.length <= 850);
}

function sourceLabel(source: SourceDescriptor, chunk: SourceChunkInput) {
  const page = chunk.printedPage ? `p. ${chunk.printedPage}` : `PDF page ${chunk.pageNumber}`;
  return `${source.label} · ${page}`;
}

export function buildReasoningEvidence(topic: string, chunks: SourceChunkInput[], sources: SourceDescriptor[]) {
  const sourceMap = new Map(sources.map((source) => [source.documentId, source]));
  const objectiveTerms = sourceTerms(topic).slice(0, 16);
  const candidates = chunks.flatMap((chunk) => sourceSentences(chunk.textContent).map((quote) => ({ chunk, quote, lower: quote.toLowerCase() })));
  const used = new Set<string>();

  return reasoningStages.map((stage) => {
    const ranked = candidates.map((candidate) => {
      const objectiveHits = objectiveTerms.filter((term) => candidate.lower.includes(term)).length;
      const stageHits = stage.keywords.filter((term) => candidate.lower.includes(term)).length;
      const exactTopic = candidate.lower.includes(topic.toLowerCase());
      return { ...candidate, objectiveHits, stageHits, score: (exactTopic ? 12 : 0) + objectiveHits * 5 + stageHits * 3 };
    }).filter((candidate) => candidate.objectiveHits > 0 && candidate.stageHits > 0)
      .sort((a, b) => b.score - a.score || b.objectiveHits - a.objectiveHits || a.chunk.pageNumber - b.chunk.pageNumber);
    const chosen = ranked.find((candidate) => !used.has(`${candidate.chunk.documentId}:${candidate.chunk.pageNumber}:${candidate.quote}`));
    if (!chosen) return { ...stage, evidence: null };
    used.add(`${chosen.chunk.documentId}:${chosen.chunk.pageNumber}:${chosen.quote}`);
    const source = sourceMap.get(chosen.chunk.documentId) ?? { documentId: chosen.chunk.documentId, label: "Approved source" };
    return {
      ...stage,
      evidence: {
        documentId: chosen.chunk.documentId,
        pageNumber: chosen.chunk.pageNumber,
        printedPage: chosen.chunk.printedPage,
        quote: chosen.quote,
        sourceLabel: sourceLabel(source, chosen.chunk),
        readerHref: `/reader/${chosen.chunk.documentId}?page=${chosen.chunk.pageNumber}`,
        score: chosen.score,
      },
    };
  });
}

function topObjectivePassages(topic: string, chunks: SourceChunkInput[], source: SourceDescriptor) {
  const objectiveTerms = sourceTerms(topic).slice(0, 16);
  return chunks.flatMap((chunk) => sourceSentences(chunk.textContent).map((quote) => {
    const lower = quote.toLowerCase();
    const hits = objectiveTerms.filter((term) => lower.includes(term)).length;
    return { documentId: chunk.documentId, pageNumber: chunk.pageNumber, printedPage: chunk.printedPage, quote, terms: sourceTerms(quote), score: hits * 5 + (lower.includes(topic.toLowerCase()) ? 12 : 0), sourceLabel: sourceLabel(source, chunk), readerHref: `/reader/${chunk.documentId}?page=${chunk.pageNumber}` };
  })).filter((passage) => passage.score > 0).sort((a, b) => b.score - a.score || a.pageNumber - b.pageNumber).slice(0, 3);
}

function hasAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

function measuredValues(value: string) {
  return new Set(value.toLowerCase().match(/\b\d+(?:\.\d+)?\s*(?:%|mg|g|mmhg|ml|l\/min|hours?|days?|weeks?)\b/g) ?? []);
}

export function compareApprovedSources(topic: string, leftChunks: SourceChunkInput[], rightChunks: SourceChunkInput[], leftSource: SourceDescriptor, rightSource: SourceDescriptor) {
  const left = topObjectivePassages(topic, leftChunks, leftSource);
  const right = topObjectivePassages(topic, rightChunks, rightSource);
  if (!left.length || !right.length) return { left, right, sharedTerms: [], leftOnlyTerms: [], rightOnlyTerms: [], flags: [{ kind: "coverage", label: "Insufficient matched evidence", detail: "At least one approved book lacks a passage that matches this objective closely enough. Review the mapping or upload a more focused section." }] };

  const topicTerms = new Set(sourceTerms(topic));
  const leftTerms = new Set(left.flatMap((passage) => passage.terms).filter((term) => !topicTerms.has(term)));
  const rightTerms = new Set(right.flatMap((passage) => passage.terms).filter((term) => !topicTerms.has(term)));
  const sharedTerms = [...leftTerms].filter((term) => rightTerms.has(term)).sort().slice(0, 12);
  const leftOnlyTerms = [...leftTerms].filter((term) => !rightTerms.has(term)).slice(0, 12);
  const rightOnlyTerms = [...rightTerms].filter((term) => !leftTerms.has(term)).slice(0, 12);
  const leftText = left.map((passage) => passage.quote.toLowerCase()).join(" ");
  const rightText = right.map((passage) => passage.quote.toLowerCase()).join(" ");
  const flags: Array<{ kind: string; label: string; detail: string }> = [];
  const directionPairs = [["increase", "decrease"], ["higher", "lower"], ["rise", "fall"], ["benefit", "harm"]];
  if (directionPairs.some(([up, down]) => (leftText.includes(up) && rightText.includes(down)) || (leftText.includes(down) && rightText.includes(up)))) flags.push({ kind: "direction", label: "Possible directional difference", detail: "The matched passages use opposing directional language. Check whether they describe different populations, time points, or conditions before treating this as a disagreement." });
  const leftNegation = hasAny(leftText, [" no ", " not ", " without ", " never "]);
  const rightNegation = hasAny(rightText, [" no ", " not ", " without ", " never "]);
  if (sharedTerms.length >= 3 && leftNegation !== rightNegation) flags.push({ kind: "negation", label: "Possible qualifying difference", detail: "Only one matched passage contains explicit negative language. Read both pages to confirm the scope and exception." });
  const leftValues = measuredValues(leftText);
  const rightValues = measuredValues(rightText);
  if (leftValues.size && rightValues.size && [...leftValues].some((value) => !rightValues.has(value)) && [...rightValues].some((value) => !leftValues.has(value))) flags.push({ kind: "number", label: "Different measured values", detail: "The passages contain different numerical values or units. Verify population, threshold, and edition context." });
  if (!flags.length) flags.push({ kind: "none", label: "No automatic contradiction detected", detail: "The books may still differ in emphasis or scope. This check never replaces reading the cited passages or human review." });

  return { left, right, sharedTerms, leftOnlyTerms, rightOnlyTerms, flags };
}
