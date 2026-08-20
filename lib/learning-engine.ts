export type LearningQuestion = {
  id: string;
  domain: "cardiac-cycle" | "cardiac-output";
  lessonSlug: "cardiac-cycle" | "cardiac-output";
  prompt: string;
  options: string[];
  correctOption: number;
  correction: string;
  sourceLabel: string;
};

export const diagnosticAssessment = {
  id: "cardiovascular-diagnostic-01",
  title: "Cardiovascular starting diagnostic",
  subtitle: "Eight source-trailed questions from the two live foundation lessons",
  questions: [
    { id: "diag-av-close", domain: "cardiac-cycle", lessonSlug: "cardiac-cycle", prompt: "What closes the atrioventricular valves?", options: ["Atrial pressure exceeding ventricular pressure", "Ventricular pressure exceeding atrial pressure", "Arterial pressure exceeding ventricular pressure", "A fall in venous pressure"], correctOption: 1, correction: "The AV valves close when ventricular pressure rises above atrial pressure.", sourceLabel: "Cardiac cycle · AV-valve closure" },
    { id: "diag-iso-volume", domain: "cardiac-cycle", lessonSlug: "cardiac-cycle", prompt: "Why is ventricular volume unchanged during isovolumetric contraction?", options: ["The ventricles are relaxed", "The AV valves remain open", "All valves are closed", "Ejection has already started"], correctOption: 2, correction: "All valves are closed, so pressure rises without a change in volume.", sourceLabel: "Cardiac cycle · Isovolumetric contraction" },
    { id: "diag-ejection", domain: "cardiac-cycle", lessonSlug: "cardiac-cycle", prompt: "When does ventricular ejection begin?", options: ["When atrial pressure exceeds ventricular pressure", "When ventricular pressure exceeds arterial pressure", "Immediately after S2", "When all four valves close"], correctOption: 1, correction: "Ejection begins when ventricular pressure exceeds pressure in the aorta or pulmonary artery and opens the semilunar valve.", sourceLabel: "Cardiac cycle · Ventricular ejection" },
    { id: "diag-s2", domain: "cardiac-cycle", lessonSlug: "cardiac-cycle", prompt: "Which valve event produces S2?", options: ["AV-valve closure", "AV-valve opening", "Semilunar-valve closure", "Semilunar-valve opening"], correctOption: 2, correction: "S2 is produced by closure of the aortic and pulmonary valves.", sourceLabel: "Cardiac cycle · S2" },
    { id: "diag-co-formula", domain: "cardiac-output", lessonSlug: "cardiac-output", prompt: "Which formula defines cardiac output?", options: ["HR ÷ SV", "HR × SV", "EDV × ESV", "SV ÷ HR"], correctOption: 1, correction: "Cardiac output equals heart rate multiplied by stroke volume.", sourceLabel: "Cardiac output · CO = HR × SV" },
    { id: "diag-co-calc", domain: "cardiac-output", lessonSlug: "cardiac-output", prompt: "A heart rate of 75/min and stroke volume of 80 mL produce what cardiac output?", options: ["0.6 L/min", "6.0 L/min", "60 L/min", "155 L/min"], correctOption: 1, correction: "75 × 80 = 6,000 mL/min, or 6.0 L/min.", sourceLabel: "Cardiac output · Calculation" },
    { id: "diag-afterload", domain: "cardiac-output", lessonSlug: "cardiac-output", prompt: "What usually happens immediately when afterload rises?", options: ["ESV rises and SV falls", "ESV falls and SV rises", "EDV and ESV both become zero", "Heart rate must fall"], correctOption: 0, correction: "A higher opposing load makes ejection harder, tending to increase ESV and reduce stroke volume.", sourceLabel: "Cardiac output · Afterload" },
    { id: "diag-contractility", domain: "cardiac-output", lessonSlug: "cardiac-output", prompt: "What does contractility describe?", options: ["Starting myocardial stretch", "Squeeze strength at a given loading condition", "The arterial pressure alone", "The duration of diastole"], correctOption: 1, correction: "Contractility is the strength of contraction at a given loading condition; preload is the starting stretch.", sourceLabel: "Cardiac output · Contractility" },
  ] satisfies LearningQuestion[],
};

export const clinicalCases = [{
  id: "forward-flow-reasoning-01",
  title: "Falling forward flow",
  subtitle: "A progressive physiology case without unapproved disease or management claims",
  sourceScope: "Cardiac cycle and cardiac output · two live lessons",
  steps: [
    { id: "case-output", lessonSlug: "cardiac-output", stage: "Observation", prompt: "The heart rate is 100/min and stroke volume is 45 mL. What is the cardiac output?", options: ["0.45 L/min", "4.5 L/min", "45 L/min", "145 L/min"], correctOption: 1, correction: "CO = HR × SV = 100 × 45 = 4,500 mL/min, or 4.5 L/min.", sourceLabel: "Cardiac output · CO = HR × SV" },
    { id: "case-av-event", lessonSlug: "cardiac-cycle", stage: "Timing", prompt: "Ventricular pressure has just risen above atrial pressure. What happens next?", options: ["AV valves open", "AV valves close and S1 follows", "Semilunar valves close and S2 follows", "Ventricular filling accelerates"], correctOption: 1, correction: "The pressure crossover closes the AV valves; this valve closure produces S1.", sourceLabel: "Cardiac cycle · AV-valve closure and S1" },
    { id: "case-load-change", lessonSlug: "cardiac-output", stage: "Mechanism", prompt: "The opposing arterial load rises acutely. Which immediate ventricular change is most consistent?", options: ["Lower ESV and higher SV", "Higher ESV and lower SV", "No change in ejection", "Stroke volume must double"], correctOption: 1, correction: "Higher afterload opposes ejection, tending to leave more end-systolic volume and reduce stroke volume.", sourceLabel: "Cardiac output · Afterload opposes ejection" },
    { id: "case-name-factor", lessonSlug: "cardiac-output", stage: "Synthesis", prompt: "Which stroke-volume determinant changed in the previous step?", options: ["Preload", "Afterload", "Contractility", "Heart rate"], correctOption: 1, correction: "The altered determinant is afterload: the load the ventricle must overcome to eject.", sourceLabel: "Cardiac output · Determinants of stroke volume" },
  ],
}];

export const visualChallenges = [
  { id: "visual-closed-valves", lessonSlug: "cardiac-cycle", kind: "pressure", title: "Pressure gates", prompt: "Atrial pressure is 8, ventricular pressure is 20, and arterial pressure is 80 mmHg. Both valve sets are closed. Which phase is shown?", options: ["Ventricular filling", "Isovolumetric contraction", "Ventricular ejection", "Rapid relaxation with AV valves open"], correctOption: 1, correction: "Ventricular pressure has exceeded atrial pressure but not arterial pressure, so both valve sets are closed during isovolumetric contraction.", sourceLabel: "Cardiac cycle · Pressure-driven valve states", values: [8, 20, 80], labels: ["Atrium", "Ventricle", "Artery"] },
  { id: "visual-ejection", lessonSlug: "cardiac-cycle", kind: "pressure", title: "Opening the outflow gate", prompt: "Atrial pressure is 8, ventricular pressure is 120, and arterial pressure is 80 mmHg. What is happening?", options: ["AV valves open", "Semilunar valves open and ejection occurs", "All valves remain closed", "Passive filling occurs"], correctOption: 1, correction: "Ventricular pressure exceeds arterial pressure, opening the semilunar valve and allowing ejection.", sourceLabel: "Cardiac cycle · Ventricular ejection", values: [8, 120, 80], labels: ["Atrium", "Ventricle", "Artery"] },
  { id: "visual-output", lessonSlug: "cardiac-output", kind: "output", title: "Flow meter", prompt: "The visual shows HR 80/min and SV 60 mL. Which output belongs in the final meter?", options: ["0.48 L/min", "4.8 L/min", "48 L/min", "140 L/min"], correctOption: 1, correction: "80 × 60 = 4,800 mL/min, or 4.8 L/min.", sourceLabel: "Cardiac output · CO = HR × SV", values: [80, 60, 48], labels: ["HR/min", "SV mL", "CO ×0.1"] },
  { id: "visual-afterload", lessonSlug: "cardiac-output", kind: "comparison", title: "Before and after", prompt: "The second pattern shows more end-systolic volume and less stroke volume. Which change best explains it?", options: ["Acute rise in afterload", "Lower afterload", "Greater ejection with lower ESV", "No change in loading"], correctOption: 0, correction: "An acute rise in afterload makes ejection harder, so ESV tends to rise and stroke volume tends to fall.", sourceLabel: "Cardiac output · Afterload pattern", values: [45, 70, 75], labels: ["ESV before", "ESV after", "SV before"] },
];

export const learningGraph = [
  { id: "syllabus", lane: "Requirement", title: "Semester 7 objective", detail: "The university objective defines what must be learned.", href: "/coverage" },
  { id: "pathway", lane: "Sequence", title: "Prerequisite and competency path", detail: "The cardiovascular subject exposes every dependency, source gate, and performance target.", href: "/cardiovascular-pathway" },
  { id: "source", lane: "Evidence", title: "Approved source section", detail: "A reviewed mapping and matching book section ground the teaching.", href: "/alignment" },
  { id: "compare-source", lane: "Compare", title: "Cross-book evidence", detail: "Two approved books can be compared by exact passage with cautious difference flags.", href: "/source-compare" },
  { id: "source-pack", lane: "Prepare", title: "Reviewed source pack", detail: "One exact passage becomes reviewable lesson, recall, case, and viva scaffolds with visible gaps.", href: "/source-packs" },
  { id: "illness-script", lane: "Organize", title: "Approved illness script", detail: "Supported disease evidence is arranged for reasoning while absent clinical fields stay explicit.", href: "/illness-scripts" },
  { id: "lesson", lane: "Learn", title: "Professor Mode lesson", detail: "Foundation-first explanation, notes, recall, and a sideways map.", href: "/learn/cardiovascular/cardiac-cycle" },
  { id: "professor", lane: "Explain", title: "Adaptive Professor Mode", detail: "A Socratic teach-back targets the weakest saved mechanism and records missing links.", href: "/cardiovascular-pathway#professor-2" },
  { id: "diagnostic", lane: "Measure", title: "Starting diagnostic", detail: "Domain scores reveal what can be skipped and what needs repair.", href: "/diagnostic" },
  { id: "case", lane: "Apply", title: "Progressive clinical case", detail: "Decisions unfold one step at a time and stay inside approved scope.", href: "/cases" },
  { id: "encounter", lane: "Encounter", title: "Branching clinical encounter", detail: "History, examination, investigation, differential, management, and communication include explicit source stops.", href: "/clinical-encounter" },
  { id: "reasoning", lane: "Connect", title: "Clinical reasoning ladder", detail: "Normal physiology connects stepwise to mechanism, presentation, testing, and management.", href: "/reasoning-ladder" },
  { id: "differential", lane: "Compare", title: "Differential diagnosis trainer", detail: "Approved illness scripts expose the findings that separate close alternatives.", href: "/diagnostic-reasoning" },
  { id: "justification", lane: "Defend", title: "Diagnostic justification", detail: "The diagnosis, supporting findings, pertinent negatives, alternatives, and missing information are scored together.", href: "/diagnostic-reasoning" },
  { id: "counterfactual", lane: "Transfer", title: "Counterfactual transfer", detail: "One changed finding tests whether the causal diagnosis can be revised safely.", href: "/diagnostic-reasoning" },
  { id: "visual", lane: "Interpret", title: "Visual laboratory", detail: "Pressure and flow patterns train visual interpretation.", href: "/visual-lab" },
  { id: "interleave", lane: "Mix", title: "Interleaved review", detail: "Related domains alternate so the learner must choose the mechanism.", href: "/interleaved" },
  { id: "progress-test", lane: "Retest", title: "Cumulative progress test", detail: "Old and new foundations return after a risk-adjusted delay.", href: "/cardiovascular-pathway#progress-test" },
  { id: "viva", lane: "Explain", title: "Oral viva", detail: "Spoken or typed explanations expose missing concept links.", href: "/viva" },
  { id: "voice", lane: "Speak", title: "Voice teach-back", detail: "One spoken reasoning chain is checked link by link and missing steps enter focused recall.", href: "/voice-teach-back" },
  { id: "confidence", lane: "Calibrate", title: "Confidence calibration", detail: "Accuracy and certainty reveal hidden high-confidence errors.", href: "/confidence" },
  { id: "question-quality", lane: "Govern", title: "Question-quality laboratory", detail: "Personal item signals prompt individual review without pretending to be cohort psychometrics.", href: "/question-quality" },
  { id: "freshness", lane: "Refresh", title: "Evidence freshness", detail: "Editions, review dates, conflicts, and superseded sources are logged without automatic clinical rewrites.", href: "/evidence-governance" },
  { id: "blueprint", lane: "Plan", title: "Exam blueprint", detail: "Syllabus objectives connect to MCQ, SAQ, OSCE, and viva lanes.", href: "/exam-blueprint" },
  { id: "correction", lane: "Correct", title: "Mistake and review loop", detail: "Incorrect concepts enter the notebook and scheduled recall queue.", href: "/mistakes" },
  { id: "misconception", lane: "Repair", title: "Misconception micro-lesson", detail: "Repeated errors are grouped into a short correction and retrieval reflection.", href: "/misconceptions" },
  { id: "mastery", lane: "Prove", title: "Strict mastery proof", detail: "A topic passes only after recall, explanation, application, and delayed retention.", href: "/mastery-proof" },
  { id: "outcomes", lane: "Measure", title: "Real learning outcomes", detail: "Delayed retention, first-attempt transfer, confidence accuracy, and weak prerequisites remain visible with sample sizes.", href: "/outcomes" },
];
