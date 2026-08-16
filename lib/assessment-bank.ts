export type AssessmentQuestion = {
  id: string;
  lessonSlug: "cardiac-cycle" | "cardiac-output";
  prompt: string;
  options: string[];
  correctOption: number;
  correction: string;
  sourceLabel: string;
};

export type AssessmentSet = {
  id: string;
  subject: "Internal Medicine I";
  title: string;
  subtitle: string;
  timeMinutes: number;
  questions: AssessmentQuestion[];
};

export const cardiovascularAssessment: AssessmentSet = {
  id: "cardiovascular-foundations-01",
  subject: "Internal Medicine I",
  title: "Cardiovascular foundations check",
  subtitle: "Cardiac cycle and cardiac output · professor-authored from the two live source-trailed lessons",
  timeMinutes: 8,
  questions: [
    {
      id: "cycle-pressure-av",
      lessonSlug: "cardiac-cycle",
      prompt: "Which pressure change closes the atrioventricular valves?",
      options: ["Atrial pressure rises above ventricular pressure", "Ventricular pressure rises above atrial pressure", "Arterial pressure falls below ventricular pressure", "Venous pressure falls below atrial pressure"],
      correctOption: 1,
      correction: "The mitral and tricuspid valves close when ventricular pressure rises above atrial pressure.",
      sourceLabel: "Cardiac cycle · AV-valve closure and S1",
    },
    {
      id: "cycle-isovolumetric",
      lessonSlug: "cardiac-cycle",
      prompt: "Why does ventricular volume remain constant during isovolumetric contraction?",
      options: ["The myocardium is not contracting", "Only the AV valves are open", "All valves are closed", "Blood is moving into the aorta"],
      correctOption: 2,
      correction: "All four valves are closed, so ventricular pressure rises without inflow or outflow.",
      sourceLabel: "Cardiac cycle · Isovolumetric contraction",
    },
    {
      id: "cycle-s2",
      lessonSlug: "cardiac-cycle",
      prompt: "Which event produces the second heart sound?",
      options: ["AV-valve opening", "AV-valve closure", "Semilunar-valve opening", "Semilunar-valve closure"],
      correctOption: 3,
      correction: "S2 follows closure of the aortic and pulmonary valves as ventricular pressure falls below arterial pressure.",
      sourceLabel: "Cardiac cycle · Semilunar-valve closure and S2",
    },
    {
      id: "output-calculation",
      lessonSlug: "cardiac-output",
      prompt: "A heart rate of 80/min and stroke volume of 60 mL produce which cardiac output?",
      options: ["0.48 L/min", "4.8 L/min", "48 L/min", "140 L/min"],
      correctOption: 1,
      correction: "CO = HR × SV = 80 × 60 = 4,800 mL/min, or 4.8 L/min.",
      sourceLabel: "Cardiac output · CO = HR × SV",
    },
    {
      id: "output-afterload",
      lessonSlug: "cardiac-output",
      prompt: "What is the usual immediate effect of an acute rise in afterload?",
      options: ["ESV falls and stroke volume rises", "ESV rises and stroke volume falls", "Both ESV and stroke volume fall", "Neither ESV nor stroke volume changes"],
      correctOption: 1,
      correction: "A higher opposing load makes ejection harder, so end-systolic volume tends to rise and stroke volume tends to fall.",
      sourceLabel: "Cardiac output · Afterload opposes ejection",
    },
    {
      id: "output-preload-contractility",
      lessonSlug: "cardiac-output",
      prompt: "Which statement best distinguishes preload from contractility?",
      options: ["Preload is rate; contractility is rhythm", "Preload is starting stretch; contractility is squeeze strength at a given load", "Preload is arterial pressure; contractility is venous pressure", "Preload is ESV; contractility is EDV"],
      correctOption: 1,
      correction: "Preload describes myocardial stretch before contraction; contractility describes the strength of contraction at a given loading condition.",
      sourceLabel: "Cardiac output · Preload and contractility",
    },
  ],
};

export const assessmentSets = [cardiovascularAssessment];

export function findAssessment(assessmentId: string) {
  return assessmentSets.find((assessment) => assessment.id === assessmentId);
}

export const clinicalPracticeCards = [
  {
    id: "saq-cardiac-cycle",
    type: "SAQ",
    title: "Explain one complete cardiac cycle",
    prompt: "Use pressure differences to explain valve movement, volume change, S1, and S2 from filling through relaxation.",
    checkpoint: "A strong answer follows the sequence and explicitly links each valve event to the relevant pressure crossover.",
    sourceLabel: "Cardiac cycle · complete live lesson",
    href: "/learn/cardiovascular/cardiac-cycle",
  },
  {
    id: "osce-cardiovascular-sequence",
    type: "Mini-OSCE",
    title: "Cardiovascular examination sequence",
    prompt: "Practise introduction, consent, general inspection, hands, pulse, blood pressure, precordium, auscultation, peripheral signs, and closure.",
    checkpoint: "This is a sequence scaffold only. Examination findings require the later approved examination lesson.",
    sourceLabel: "Internal Medicine syllabus · examination objective",
    href: "/alignment#alignment-table",
  },
];
