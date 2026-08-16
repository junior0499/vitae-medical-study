import type { CoverageObjective } from "@/lib/subject-alignments";

export type VivaQuestion = {
  id: string;
  lessonSlug: "cardiac-cycle" | "cardiac-output";
  prompt: string;
  hint: string;
  conceptGroups: string[][];
  modelAnswer: string;
  sourceLabel: string;
};

export const vivaSession = {
  id: "cardiovascular-viva-01",
  title: "Cardiovascular foundation viva",
  questions: [
    {
      id: "viva-valve-timing",
      lessonSlug: "cardiac-cycle",
      prompt: "Explain why the atrioventricular valves close at the start of ventricular systole.",
      hint: "Build the answer around a pressure crossover and the sound it creates.",
      conceptGroups: [["ventricular pressure", "pressure in the ventricle"], ["atrial pressure", "pressure in the atrium"], ["close", "closure"], ["s1", "first heart sound"]],
      modelAnswer: "As ventricular systole begins, ventricular pressure rises above atrial pressure. That pressure reversal closes the atrioventricular valves, and their closure contributes to S1.",
      sourceLabel: "Cardiac cycle · AV-valve closure and S1",
    },
    {
      id: "viva-isovolumetric",
      lessonSlug: "cardiac-cycle",
      prompt: "What makes isovolumetric contraction isovolumetric even though ventricular pressure is rising?",
      hint: "Say what every valve is doing, then connect that state to volume.",
      conceptGroups: [["all valves", "both valve sets"], ["closed"], ["no blood", "no flow", "cannot enter", "cannot leave"], ["volume", "unchanged"]],
      modelAnswer: "During isovolumetric contraction, both the atrioventricular and semilunar valves are closed. Blood can neither enter nor leave the ventricle, so pressure rises while ventricular volume stays unchanged.",
      sourceLabel: "Cardiac cycle · Isovolumetric contraction",
    },
    {
      id: "viva-output",
      lessonSlug: "cardiac-output",
      prompt: "Define cardiac output and explain how heart rate and stroke volume determine it.",
      hint: "State the formula, the unit of time, and what stroke volume represents.",
      conceptGroups: [["heart rate", "hr"], ["stroke volume", "sv"], ["multiply", "multiplied", "times", "×"], ["minute", "per min"]],
      modelAnswer: "Cardiac output is the volume pumped by one ventricle each minute. It equals heart rate multiplied by stroke volume: CO = HR × SV.",
      sourceLabel: "Cardiac output · CO = HR × SV",
    },
    {
      id: "viva-afterload",
      lessonSlug: "cardiac-output",
      prompt: "Explain the immediate effect of an acute rise in afterload on end-systolic volume and stroke volume.",
      hint: "Start with resistance to ejection, then follow the blood left behind.",
      conceptGroups: [["harder", "opposes", "resist", "load"], ["eject", "ejection"], ["end-systolic volume", "esv"], ["increase", "rise", "higher"], ["stroke volume", "sv"], ["decrease", "fall", "lower"]],
      modelAnswer: "An acute rise in afterload opposes ventricular ejection. More blood therefore remains at end systole, so end-systolic volume rises and stroke volume falls.",
      sourceLabel: "Cardiac output · Afterload pattern",
    },
  ] satisfies VivaQuestion[],
};

export const interleavedSession = {
  id: "cardiovascular-interleaved-01",
  title: "Mixed cardiovascular foundations",
  questions: [
    { id: "mix-s1", domain: "Cardiac cycle", lessonSlug: "cardiac-cycle", prompt: "Which pressure change closes the AV valves?", options: ["Atrial pressure rises above ventricular pressure", "Ventricular pressure rises above atrial pressure", "Arterial pressure falls below atrial pressure", "Venous pressure becomes zero"], correctOption: 1, correction: "AV valves close when ventricular pressure exceeds atrial pressure.", sourceLabel: "Cardiac cycle · AV-valve closure" },
    { id: "mix-formula", domain: "Cardiac output", lessonSlug: "cardiac-output", prompt: "Which pair must be multiplied to calculate cardiac output?", options: ["EDV and ESV", "Heart rate and stroke volume", "Systolic and diastolic pressure", "Preload and afterload"], correctOption: 1, correction: "Cardiac output equals heart rate multiplied by stroke volume.", sourceLabel: "Cardiac output · CO = HR × SV" },
    { id: "mix-iso", domain: "Cardiac cycle", lessonSlug: "cardiac-cycle", prompt: "Pressure rises while ventricular volume is unchanged. Which valve state fits?", options: ["AV valves open", "Semilunar valves open", "All valves closed", "All valves open"], correctOption: 2, correction: "All valves are closed during isovolumetric contraction, so pressure can rise without a volume change.", sourceLabel: "Cardiac cycle · Isovolumetric contraction" },
    { id: "mix-afterload", domain: "Cardiac output", lessonSlug: "cardiac-output", prompt: "What is the most immediate pattern after an acute rise in afterload?", options: ["ESV falls and SV rises", "ESV rises and SV falls", "Both volumes become zero", "Heart rate defines the valve state"], correctOption: 1, correction: "Higher afterload opposes ejection, tending to increase ESV and reduce stroke volume.", sourceLabel: "Cardiac output · Afterload" },
    { id: "mix-ejection", domain: "Cardiac cycle", lessonSlug: "cardiac-cycle", prompt: "What initiates ventricular ejection?", options: ["Atrial pressure exceeds ventricular pressure", "Ventricular pressure exceeds arterial pressure", "Semilunar valves close", "S2 occurs before the pressure crossover"], correctOption: 1, correction: "Ejection begins when ventricular pressure exceeds arterial pressure and opens the semilunar valve.", sourceLabel: "Cardiac cycle · Ejection" },
    { id: "mix-calc", domain: "Cardiac output", lessonSlug: "cardiac-output", prompt: "HR is 90/min and SV is 70 mL. What is cardiac output?", options: ["0.63 L/min", "6.3 L/min", "63 L/min", "160 L/min"], correctOption: 1, correction: "90 × 70 = 6,300 mL/min, or 6.3 L/min.", sourceLabel: "Cardiac output · Calculation" },
    { id: "mix-s2", domain: "Cardiac cycle", lessonSlug: "cardiac-cycle", prompt: "Which event produces S2?", options: ["AV-valve opening", "AV-valve closure", "Semilunar-valve opening", "Semilunar-valve closure"], correctOption: 3, correction: "Closure of the aortic and pulmonary valves produces S2.", sourceLabel: "Cardiac cycle · S2" },
    { id: "mix-contractility", domain: "Cardiac output", lessonSlug: "cardiac-output", prompt: "Which description best matches contractility?", options: ["Starting myocardial stretch", "Opposing arterial load", "Squeeze strength at a given loading condition", "Beats per minute"], correctOption: 2, correction: "Contractility describes squeeze strength at a given loading condition.", sourceLabel: "Cardiac output · Contractility" },
  ],
};

export const comparisonModes = [
  {
    id: "afterload-bridge",
    title: "Normal ejection vs raised afterload",
    foundation: "Cardiac output",
    sourceLabel: "Cardiac output · Afterload and stroke volume",
    rows: [
      { label: "Outflow condition", normal: "The ventricle ejects once its pressure exceeds arterial pressure.", altered: "A higher opposing arterial load makes that ejection harder.", state: "supported" },
      { label: "End-systolic volume", normal: "The volume left after ejection reflects how much blood was not expelled.", altered: "More blood tends to remain, so ESV rises.", state: "supported" },
      { label: "Stroke volume", normal: "SV is the volume ejected per beat.", altered: "With more blood left behind, SV tends to fall.", state: "supported" },
      { label: "Symptoms and examination", normal: "Requires an approved clinical source.", altered: "Locked until a matching disease section is approved.", state: "locked" },
      { label: "Investigations and management", normal: "Requires an approved clinical source.", altered: "Locked until a matching disease section is approved.", state: "locked" },
    ],
  },
  {
    id: "contractility-bridge",
    title: "Normal squeeze vs reduced contractility",
    foundation: "Cardiac output",
    sourceLabel: "Cardiac output · Contractility",
    rows: [
      { label: "Core definition", normal: "Contractility is squeeze strength at a given loading condition.", altered: "Reduced contractility means less squeeze strength at the same loading condition.", state: "supported" },
      { label: "Ejection bridge", normal: "A stronger effective squeeze supports ventricular ejection.", altered: "A weaker squeeze tends to reduce ejection.", state: "supported" },
      { label: "Flow consequence", normal: "Stroke volume contributes to output through CO = HR × SV.", altered: "A fall in stroke volume tends to reduce output if heart rate does not compensate.", state: "supported" },
      { label: "Named diseases and symptoms", normal: "Requires an approved clinical source.", altered: "Locked until a matching disease section is approved.", state: "locked" },
      { label: "Investigations and treatment", normal: "Requires an approved clinical source.", altered: "Locked until a matching disease section is approved.", state: "locked" },
    ],
  },
] as const;

export type ExamModality = "MCQ" | "SAQ" | "OSCE" | "Viva";

export function buildExamBlueprint(objective: CoverageObjective) {
  const text = `${objective.system} ${objective.topic}`.toLowerCase();
  const modalities = new Set<ExamModality>(["MCQ"]);
  if (/approach|examination|assessment|screening|imaging|delivery|immobilization/.test(text)) modalities.add("OSCE");
  if (/disease|injur|complication|diagnos|treatment|management|labor|failure|syndrome|case/.test(text)) modalities.add("SAQ");
  if (/physiology|function|mechanism|theory|development|anatomy|electrophysiology|care/.test(text)) modalities.add("Viva");
  if (objective.system === "Clinical cases") { modalities.add("SAQ"); modalities.add("OSCE"); modalities.add("Viva"); }
  const importance = modalities.size >= 3 ? "High" : modalities.size === 2 ? "Medium" : "Foundation";
  return { ...objective, modalities: [...modalities], importance, estimateBasis: "Planning estimate from syllabus wording and listed assessment formats; not official weighting." };
}
