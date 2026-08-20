export type PathwayNode = {
  id: string;
  kind: "foundation" | "clinical";
  week: string;
  title: string;
  objective: string;
  competency: string;
  prerequisites: string[];
  href: string;
};

export const cardiovascularPathwayNodes: PathwayNode[] = [
  { id: "foundation-cardiac-cycle", kind: "foundation", week: "Start", title: "Cardiac cycle", objective: "Build the pressure, valve, volume, and heart-sound sequence before disease.", competency: "Trace one heartbeat and explain each valve transition from pressure.", prerequisites: [], href: "/learn/cardiovascular/cardiac-cycle" },
  { id: "foundation-cardiac-output", kind: "foundation", week: "Start", title: "Cardiac output", objective: "Connect heart rate, stroke volume, preload, afterload, and contractility.", competency: "Calculate output and predict the direction of a loading change.", prerequisites: ["foundation-cardiac-cycle"], href: "/learn/cardiovascular/cardiac-output" },
  { id: "cv-1-1", kind: "clinical", week: "I", title: "Approach, examination & ECG", objective: "Approach to the patient, cardiovascular examination and ECG.", competency: "Organize a cardiovascular encounter and connect bedside findings to the first investigation.", prerequisites: ["foundation-cardiac-cycle", "foundation-cardiac-output"], href: "/coverage#objective-cv-1-1" },
  { id: "cv-1-2", kind: "clinical", week: "I", title: "Imaging & invasive investigation", objective: "Cardiac imaging and invasive investigation.", competency: "Choose and interpret the purpose of each investigation inside the approved syllabus scope.", prerequisites: ["cv-1-1"], href: "/coverage#objective-cv-1-2" },
  { id: "cv-1-3", kind: "clinical", week: "I", title: "Electrophysiology & arrhythmia", objective: "Electrophysiology, bradyarrhythmias and tachyarrhythmias.", competency: "Move from electrical mechanism to rhythm recognition and a safe clinical explanation.", prerequisites: ["cv-1-1"], href: "/coverage#objective-cv-1-3" },
  { id: "cv-1-4", kind: "clinical", week: "I", title: "Myocardial function & failure", objective: "Normal myocardial function, heart failure and pulmonary hypertension.", competency: "Connect normal flow and loading to an approved clinical mechanism pathway.", prerequisites: ["foundation-cardiac-output"], href: "/coverage#objective-cv-1-4" },
  { id: "cv-2-5", kind: "clinical", week: "II", title: "Transplantation & congenital disease", objective: "Heart transplantation and congenital heart disease in adults.", competency: "Explain the clinical problem, investigation route, and management framework from reviewed sources.", prerequisites: ["cv-1-2", "cv-1-4"], href: "/coverage#objective-cv-2-5" },
  { id: "cv-2-6", kind: "clinical", week: "II", title: "Valvular disease", objective: "Valvular diseases of the heart.", competency: "Connect valve mechanics to examination, investigation, and management reasoning.", prerequisites: ["cv-1-1", "foundation-cardiac-cycle"], href: "/coverage#objective-cv-2-6" },
  { id: "cv-2-7", kind: "clinical", week: "II", title: "Myocardial, endocardial & pericardial disease", objective: "Cardiomyopathy, myocarditis, endocarditis and pericardial disease.", competency: "Differentiate the affected cardiac layer and build a source-grounded clinical pathway.", prerequisites: ["cv-1-2", "cv-1-4"], href: "/coverage#objective-cv-2-7" },
  { id: "cv-2-8", kind: "clinical", week: "II", title: "Tumours, systemic disease & trauma", objective: "Cardiac tumors, systemic manifestations and cardiac trauma.", competency: "Recognize the cardiovascular problem and justify the next investigation from approved material.", prerequisites: ["cv-1-1", "cv-1-2"], href: "/coverage#objective-cv-2-8" },
  { id: "cv-3-9", kind: "clinical", week: "III", title: "Atherosclerosis & ischaemia", objective: "Atherosclerosis and ischemic heart disease.", competency: "Connect vascular mechanism to presentation and investigation without skipping normal physiology.", prerequisites: ["cv-1-1", "foundation-cardiac-output"], href: "/coverage#objective-cv-3-9" },
  { id: "cv-3-10", kind: "clinical", week: "III", title: "Acute coronary syndromes", objective: "Unstable angina, NSTEMI and STEMI.", competency: "Differentiate the syndromes and work through the approved assessment and management sequence.", prerequisites: ["cv-3-9"], href: "/coverage#objective-cv-3-10" },
  { id: "cv-3-11", kind: "clinical", week: "III", title: "PCI & hypertension", objective: "PCI and hypertensive vascular disease.", competency: "Explain the intervention or vascular problem and connect it to patient-level decisions.", prerequisites: ["cv-3-10"], href: "/coverage#objective-cv-3-11" },
  { id: "cv-3-12", kind: "clinical", week: "III", title: "Aortic & peripheral vascular disease", objective: "Aortic and peripheral vascular disease.", competency: "Use mechanism, examination, and investigation to distinguish an approved vascular pathway.", prerequisites: ["cv-3-9"], href: "/coverage#objective-cv-3-12" },
];

export type ProfessorPrompt = {
  id: string;
  lessonSlug: "cardiac-cycle" | "cardiac-output";
  title: string;
  prompt: string;
  hints: string[];
  conceptGroups: Array<{ label: string; terms: string[] }>;
  modelAnswer: string;
  sourceLabel: string;
  href: string;
};

export const professorPrompts: ProfessorPrompt[] = [
  {
    id: "prof-pressure-crossover",
    lessonSlug: "cardiac-cycle",
    title: "Pressure before memorisation",
    prompt: "Explain why the atrioventricular valves close at the start of ventricular systole, and connect the event to the first heart sound.",
    hints: ["Start with the pressure on each side of an AV valve.", "Which pressure becomes greater as ventricular systole begins?", "Finish by naming the valve event associated with S1."],
    conceptGroups: [
      { label: "ventricular pressure rises above atrial pressure", terms: ["ventricular pressure exceeds atrial", "ventricular pressure rises above atrial", "ventricle pressure exceeds atrium", "ventricular pressure becomes greater"] },
      { label: "AV-valve closure", terms: ["av valve closes", "av valves close", "atrioventricular valve closes", "atrioventricular valves close", "mitral and tricuspid close"] },
      { label: "S1 connection", terms: ["s1", "first heart sound"] },
    ],
    modelAnswer: "As ventricular systole begins, ventricular pressure rises above atrial pressure. The pressure reversal closes the mitral and tricuspid valves, and this AV-valve closure contributes to S1.",
    sourceLabel: "Cardiac cycle · AV-valve closure and S1",
    href: "/learn/cardiovascular/cardiac-cycle",
  },
  {
    id: "prof-isovolumetric",
    lessonSlug: "cardiac-cycle",
    title: "Explain the unchanged volume",
    prompt: "Pressure rises during isovolumetric contraction. Explain why ventricular volume does not change.",
    hints: ["Account for both valve sets.", "Can blood enter or leave the ventricle during this phase?", "Separate the pressure change from the volume change."],
    conceptGroups: [
      { label: "all valves are closed", terms: ["all valves are closed", "both valve sets are closed", "av and semilunar valves are closed", "atrioventricular and semilunar valves are closed"] },
      { label: "no blood enters or leaves", terms: ["no blood enters or leaves", "blood cannot enter or leave", "no inflow or outflow", "no blood flow"] },
      { label: "volume remains unchanged", terms: ["volume stays unchanged", "volume remains unchanged", "volume does not change", "constant volume"] },
      { label: "pressure still rises", terms: ["pressure rises", "pressure increases"] },
    ],
    modelAnswer: "Both the atrioventricular and semilunar valves are closed, so blood cannot enter or leave the ventricle. Contraction raises pressure while the trapped ventricular volume remains unchanged.",
    sourceLabel: "Cardiac cycle · Isovolumetric contraction",
    href: "/learn/cardiovascular/cardiac-cycle",
  },
  {
    id: "prof-afterload",
    lessonSlug: "cardiac-output",
    title: "Follow the load through the ventricle",
    prompt: "An acute rise in afterload occurs. Explain the immediate directional changes in ejection, end-systolic volume, and stroke volume.",
    hints: ["Treat afterload as the load opposing ejection.", "If less blood leaves, what happens to the blood remaining after systole?", "Use the relationship SV = EDV − ESV for the final direction."],
    conceptGroups: [
      { label: "ejection becomes harder", terms: ["opposes ejection", "ejection becomes harder", "harder to eject", "resistance to ejection"] },
      { label: "end-systolic volume rises", terms: ["esv rises", "esv increases", "end-systolic volume rises", "end systolic volume increases", "more blood remains"] },
      { label: "stroke volume falls", terms: ["stroke volume falls", "stroke volume decreases", "sv falls", "sv decreases", "lower stroke volume"] },
    ],
    modelAnswer: "A higher afterload opposes ventricular ejection. Less blood leaves during systole, so end-systolic volume rises and stroke volume falls in the immediate beat.",
    sourceLabel: "Cardiac output · Afterload pattern",
    href: "/learn/cardiovascular/cardiac-output",
  },
  {
    id: "prof-output-integration",
    lessonSlug: "cardiac-output",
    title: "Turn one beat into flow per minute",
    prompt: "A heart rate of 90/min and a stroke volume of 70 mL are recorded. Calculate cardiac output and explain what the number represents.",
    hints: ["Write the relationship before substituting numbers.", "Multiply 90 by 70 and keep the first result in mL/min.", "Convert millilitres to litres and define the value as flow from one ventricle per minute."],
    conceptGroups: [
      { label: "CO = HR × SV", terms: ["co = hr", "cardiac output = heart rate", "heart rate multiplied by stroke volume", "hr x sv", "hr × sv"] },
      { label: "6,300 mL/min", terms: ["6300 ml/min", "6,300 ml/min", "6300 millilitres", "6300 milliliters"] },
      { label: "6.3 L/min", terms: ["6.3 l/min", "6.3 litres", "6.3 liters"] },
      { label: "volume pumped per minute", terms: ["volume pumped per minute", "volume one ventricle pumps each minute", "flow per minute", "blood pumped by one ventricle per minute"] },
    ],
    modelAnswer: "CO = HR × SV = 90 × 70 = 6,300 mL/min, or 6.3 L/min. It represents the volume pumped by one ventricle each minute.",
    sourceLabel: "Cardiac output · CO = HR × SV",
    href: "/learn/cardiovascular/cardiac-output",
  },
];

export type ProgressTestQuestion = {
  id: string;
  lessonSlug: "cardiac-cycle" | "cardiac-output";
  domain: "cardiac-cycle" | "cardiac-output";
  tier: "repair" | "retention" | "transfer";
  prompt: string;
  options: string[];
  correctOption: number;
  correction: string;
  sourceLabel: string;
};

export const cardiovascularProgressTest = {
  id: "cardiovascular-progress-01",
  title: "Cardiovascular cumulative progress test",
  questions: [
    { id: "progress-pressure-av", lessonSlug: "cardiac-cycle", domain: "cardiac-cycle", tier: "retention", prompt: "Which pressure relationship closes the atrioventricular valves?", options: ["Atrial pressure exceeds ventricular pressure", "Ventricular pressure exceeds atrial pressure", "Arterial pressure becomes zero", "Venous pressure exceeds arterial pressure"], correctOption: 1, correction: "AV valves close when ventricular pressure rises above atrial pressure.", sourceLabel: "Cardiac cycle · AV-valve closure" },
    { id: "progress-output-calc", lessonSlug: "cardiac-output", domain: "cardiac-output", tier: "retention", prompt: "Heart rate is 80/min and stroke volume is 75 mL. What is cardiac output?", options: ["0.6 L/min", "6.0 L/min", "60 L/min", "155 L/min"], correctOption: 1, correction: "80 × 75 = 6,000 mL/min, or 6.0 L/min.", sourceLabel: "Cardiac output · Calculation" },
    { id: "progress-iso-state", lessonSlug: "cardiac-cycle", domain: "cardiac-cycle", tier: "repair", prompt: "Ventricular pressure is rising while volume is unchanged. Which valve state is required?", options: ["AV valves open", "Semilunar valves open", "All valves closed", "All valves open"], correctOption: 2, correction: "All valves are closed during isovolumetric contraction, allowing pressure to rise without a volume change.", sourceLabel: "Cardiac cycle · Isovolumetric contraction" },
    { id: "progress-afterload", lessonSlug: "cardiac-output", domain: "cardiac-output", tier: "repair", prompt: "Which immediate pattern follows an acute rise in afterload?", options: ["ESV falls and SV rises", "ESV rises and SV falls", "Both ESV and SV become zero", "Stroke volume rises without a loading change"], correctOption: 1, correction: "Higher afterload opposes ejection, so more blood remains at end systole and stroke volume falls.", sourceLabel: "Cardiac output · Afterload" },
    { id: "progress-ejection-gate", lessonSlug: "cardiac-cycle", domain: "cardiac-cycle", tier: "transfer", prompt: "Atrial pressure is 8, ventricular pressure is 120, and arterial pressure is 80 mmHg. Which event is occurring?", options: ["Passive filling", "AV-valve closure with all valves closed", "Semilunar-valve opening and ejection", "Semilunar-valve closure and filling"], correctOption: 2, correction: "Ventricular pressure exceeds arterial pressure, opening the semilunar valve and permitting ejection.", sourceLabel: "Cardiac cycle · Ventricular ejection" },
    { id: "progress-contractility", lessonSlug: "cardiac-output", domain: "cardiac-output", tier: "transfer", prompt: "Which phrase best distinguishes contractility from preload and afterload?", options: ["Starting myocardial stretch", "Opposing arterial load", "Squeeze strength at a given loading condition", "Number of beats per minute"], correctOption: 2, correction: "Contractility is squeeze strength at a given loading condition.", sourceLabel: "Cardiac output · Contractility" },
    { id: "progress-s2", lessonSlug: "cardiac-cycle", domain: "cardiac-cycle", tier: "retention", prompt: "Which event produces S2?", options: ["AV-valve closure", "Semilunar-valve closure", "AV-valve opening", "Semilunar-valve opening"], correctOption: 1, correction: "Closure of the aortic and pulmonary valves produces S2.", sourceLabel: "Cardiac cycle · S2" },
    { id: "progress-flow-change", lessonSlug: "cardiac-output", domain: "cardiac-output", tier: "transfer", prompt: "Heart rate stays constant while stroke volume falls. What happens to cardiac output?", options: ["It rises", "It falls", "It remains identical", "It becomes independent of stroke volume"], correctOption: 1, correction: "Because CO = HR × SV, a lower stroke volume lowers cardiac output when heart rate is unchanged.", sourceLabel: "Cardiac output · CO = HR × SV" },
  ] satisfies ProgressTestQuestion[],
};

export function scoreProfessorResponse(prompt: ProfessorPrompt, response: string) {
  const normalized = response.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const matched = prompt.conceptGroups.filter((group) => group.terms.some((term) => normalized.includes(term)));
  const missing = prompt.conceptGroups.filter((group) => !matched.includes(group)).map((group) => group.label);
  const score = Math.round((matched.length / prompt.conceptGroups.length) * 100);
  return { score, correct: score >= 70, matched: matched.map((group) => group.label), missing };
}
