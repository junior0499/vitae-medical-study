"use client";

import { ProfessorLessonWorkspace, type LessonStep, type RecallQuestion } from "@/components/professor-lesson-workspace";

const lessonSteps: LessonStep[] = [
  { stage: "Define", title: "Flow per minute", cue: "Cardiac output tells you how much blood one ventricle pumps each minute.", detail: "Because the circulation is a closed loop in steady state, right- and left-ventricular outputs must match over time. Cardiac output is usually expressed in litres per minute.", connect: "A normal pressure does not automatically prove that tissue blood flow is adequate." },
  { stage: "Multiply", title: "CO = HR × SV", cue: "Output depends on how often the heart beats and how much leaves with each beat.", detail: "Heart rate is beats per minute. Stroke volume is millilitres per beat. Multiply them, then convert millilitres to litres when needed.", connect: "A heart rate of 70 beats/min and stroke volume of 70 mL gives 4.9 L/min." },
  { stage: "Subtract", title: "SV = EDV − ESV", cue: "Stroke volume is the filled volume minus the volume left after contraction.", detail: "End-diastolic volume is present just before systole. End-systolic volume remains after ejection. Their difference is the amount ejected in one beat.", connect: "This links the cardiac cycle directly to cardiac output." },
  { stage: "Fill", title: "Preload sets the starting stretch", cue: "More ventricular filling usually gives the muscle more to eject—within physiological limits.", detail: "Preload describes the myocardial stretch before contraction and is commonly related to end-diastolic filling. Venous return is therefore an important upstream influence on stroke volume.", connect: "Think of preload as the filling condition before the squeeze begins." },
  { stage: "Squeeze", title: "Contractility changes the squeeze", cue: "Contractility is the strength of contraction at a given loading condition.", detail: "Greater contractility tends to eject more of the filled volume, leaving a smaller end-systolic volume and therefore a larger stroke volume.", connect: "Keep contractility separate from preload: one changes the squeeze, the other the starting fill." },
  { stage: "Resist", title: "Afterload opposes ejection", cue: "The ventricle must generate enough pressure to open the outflow valve and move blood forward.", detail: "Afterload is the load the ventricle works against during ejection. When it rises acutely, ejection becomes harder, end-systolic volume tends to rise, and stroke volume tends to fall.", connect: "This is why arterial pressure belongs in your pump model, not outside it." },
  { stage: "Integrate", title: "Predict the whole response", cue: "Cardiac output is the final result of rate, filling, squeeze and resistance acting together.", detail: "During exercise, heart rate and contractility rise, venous return supports filling, and the circulation redistributes resistance. Read each change through HR and SV before predicting the final output.", connect: "This framework prepares you for blood-pressure control and later heart-failure reasoning." },
];

const recallQuestions: RecallQuestion[] = [
  { q: "If HR is 70/min and SV is 70 mL, what is cardiac output?", a: "4,900 mL/min, or 4.9 L/min.", hint: "Multiply beats per minute by millilitres per beat, then divide by 1,000.", options: ["0.49 L/min", "4.9 L/min", "49 L/min"], followUp: "What would happen if stroke volume fell to 50 mL at the same heart rate?" },
  { q: "What usually happens to ESV and SV when afterload rises acutely?", a: "ESV tends to rise and stroke volume tends to fall because ejection is harder.", hint: "A higher opposing load makes it harder for the ventricle to empty.", options: ["ESV rises and SV falls", "ESV falls and SV rises", "Both remain unchanged"], followUp: "Use SV = EDV − ESV to explain the result." },
  { q: "How do preload and contractility differ?", a: "Preload describes the starting myocardial stretch from filling; contractility describes the strength of the squeeze at a given load.", hint: "Separate the condition before contraction from the force produced during contraction.", options: ["Starting fill versus squeeze strength", "Heart rate versus arterial pressure", "Residual volume versus ejection fraction"], followUp: "Which one is most directly influenced by venous return?" },
];

export function LessonWorkspace() {
  return <ProfessorLessonWorkspace
    lessonSlug="cardiac-output"
    title="Cardiac output"
    subtitle="Connect heart rate, stroke volume, filling, squeeze, and resistance into one working pump model."
    mapTitle="From one beat to flow per minute"
    notesLabel="My cardiac-output notes"
    notesPlaceholder={'CO = HR × SV\nSV = EDV − ESV\n\nPreload...\nContractility...\nAfterload...'}
    steps={lessonSteps}
    recallQuestions={recallQuestions}
    nextLesson={{ href: "/learn", label: "Return to the foundation route" }}
  />;
}
