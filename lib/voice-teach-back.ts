export type VoicePrompt = {
  id: string;
  kind: "teach_back" | "viva_case" | "safety_gate";
  title: string;
  lessonSlug: "cardiac-cycle" | "cardiac-output";
  scenario: string;
  prompt: string;
  hint: string;
  sourceLabel: string;
  sourceState: "supported" | "scaffold" | "locked";
  conceptGroups: Array<{ label: string; terms: string[] }>;
  modelAnswer: string;
};

export const voicePrompts: VoicePrompt[] = [
  {
    id: "voice-cycle-s1",
    kind: "teach_back",
    title: "Pressure to S1",
    lessonSlug: "cardiac-cycle",
    scenario: "The ventricle has begun to contract and its pressure has just risen above atrial pressure.",
    prompt: "Teach the examiner how that pressure change leads to the first heart sound.",
    hint: "Use this chain: pressure crossover → valve event → sound.",
    sourceLabel: "Cardiac cycle · AV-valve closure and S1",
    sourceState: "supported",
    conceptGroups: [
      { label: "ventricular pressure exceeds atrial pressure", terms: ["ventricular pressure exceeds atrial pressure", "ventricular pressure rises above atrial pressure", "ventricle pressure higher than atrium", "pressure in the ventricle is greater"] },
      { label: "AV valves close", terms: ["av valves close", "atrioventricular valves close", "mitral and tricuspid close", "mitral valve and tricuspid valve close"] },
      { label: "closure produces S1", terms: ["produces s1", "causes s1", "first heart sound", "s1 follows", "s1 is heard"] },
    ],
    modelAnswer: "When ventricular pressure rises above atrial pressure, the mitral and tricuspid valves close. Their closure produces the first heart sound, S1.",
  },
  {
    id: "voice-output-calculation",
    kind: "viva_case",
    title: "From one beat to one minute",
    lessonSlug: "cardiac-output",
    scenario: "A patient has a heart rate of 100/min and a stroke volume of 45 mL.",
    prompt: "Calculate the cardiac output aloud and explain every step, including the unit conversion.",
    hint: "State the formula, calculate in mL/min, then convert to L/min.",
    sourceLabel: "Cardiac output · CO = HR × SV",
    sourceState: "supported",
    conceptGroups: [
      { label: "CO = HR × SV", terms: ["cardiac output equals heart rate times stroke volume", "co equals hr times sv", "heart rate multiplied by stroke volume", "hr x sv", "hr × sv"] },
      { label: "100 × 45 = 4,500 mL/min", terms: ["100 times 45", "100 multiplied by 45", "4500 ml", "4,500 ml"] },
      { label: "4.5 L/min", terms: ["4.5 l", "4.5 litres", "4.5 liters", "four point five litres", "four point five liters"] },
    ],
    modelAnswer: "Cardiac output equals heart rate multiplied by stroke volume. One hundred times 45 mL gives 4,500 mL/min, which is 4.5 L/min.",
  },
  {
    id: "voice-afterload",
    kind: "teach_back",
    title: "Afterload and forward flow",
    lessonSlug: "cardiac-output",
    scenario: "The opposing arterial load rises acutely while the other starting conditions are unchanged.",
    prompt: "Explain the immediate chain from increased afterload to stroke volume.",
    hint: "Connect resistance to ejection, the blood left after systole, and the amount ejected.",
    sourceLabel: "Cardiac output · Afterload opposes ejection",
    sourceState: "supported",
    conceptGroups: [
      { label: "higher afterload opposes ejection", terms: ["afterload opposes ejection", "harder to eject", "greater resistance to ejection", "increased load against ejection"] },
      { label: "end-systolic volume rises", terms: ["esv rises", "end systolic volume rises", "more blood remains", "more volume left after systole"] },
      { label: "stroke volume falls", terms: ["stroke volume falls", "stroke volume decreases", "lower stroke volume", "less blood is ejected"] },
    ],
    modelAnswer: "A rise in afterload creates more opposition to ventricular ejection. More blood therefore tends to remain after systole, increasing end-systolic volume, while stroke volume falls.",
  },
  {
    id: "voice-management-boundary",
    kind: "safety_gate",
    title: "Stop at the evidence boundary",
    lessonSlug: "cardiac-output",
    scenario: "An examiner asks you to recommend a specific treatment, but the live source set contains only cardiac-cycle and cardiac-output physiology.",
    prompt: "Show how you would answer safely without inventing a management recommendation.",
    hint: "Name what is missing, what must happen next, and the limit of the current answer.",
    sourceLabel: "Current live source boundary · physiology only",
    sourceState: "locked",
    conceptGroups: [
      { label: "specific treatment is not supported", terms: ["treatment is not supported", "cannot recommend a specific treatment", "management is not supported", "not enough evidence for treatment", "outside the current source"] },
      { label: "an approved clinical source is required", terms: ["approved clinical source", "approved management source", "need an approved source", "requires a clinical source"] },
      { label: "clinical supervision or human review remains required", terms: ["clinical supervision", "human review", "supervisor", "clinician review", "professional review"] },
    ],
    modelAnswer: "The current approved material supports physiology only, so I cannot recommend a specific treatment from it. I would first require an approved clinical management source, and the decision would still need appropriate clinical supervision or human review.",
  },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9×.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function scoreVoiceResponse(prompt: VoicePrompt, response: string) {
  const normalized = normalize(response);
  const matched = prompt.conceptGroups.filter((group) => group.terms.some((term) => normalized.includes(normalize(term)))).map((group) => group.label);
  const missing = prompt.conceptGroups.map((group) => group.label).filter((label) => !matched.includes(label));
  const score = Math.round((matched.length / Math.max(1, prompt.conceptGroups.length)) * 100);
  return { matched, missing, score, correct: score >= 70 };
}

export function findVoicePrompt(id: string) {
  return voicePrompts.find((prompt) => prompt.id === id);
}
