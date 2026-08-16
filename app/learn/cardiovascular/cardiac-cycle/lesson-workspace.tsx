"use client";

import { ProfessorLessonWorkspace, type LessonStep, type RecallQuestion } from "@/components/professor-lesson-workspace";

const lessonSteps: LessonStep[] = [
  { stage: "Orient", title: "See one complete loop", cue: "A heartbeat is not four separate events. It is one pressure-driven loop.", detail: "Follow the left ventricle through filling, contraction, ejection and relaxation. The right side performs the same sequence at lower pressures.", connect: "Pressure differences decide whether each valve opens or closes." },
  { stage: "Fill", title: "Ventricular filling", cue: "Blood moves down a pressure gradient from atrium to ventricle.", detail: "During diastole, ventricular pressure is lower than atrial pressure. The AV valves are open, so most filling is passive. Atrial contraction adds the final portion.", connect: "Reduced ventricular compliance makes this final atrial contribution more important." },
  { stage: "Close", title: "AV valves close — S1", cue: "The ventricle begins to contract, but no blood leaves yet.", detail: "When ventricular pressure rises above atrial pressure, the mitral and tricuspid valves close. All valves are briefly closed while pressure rises: isovolumetric contraction.", connect: "AV-valve closure produces the first heart sound, S1." },
  { stage: "Open", title: "Outflow valves open", cue: "Pressure has built enough to overcome the artery ahead.", detail: "When ventricular pressure exceeds aortic or pulmonary arterial pressure, the semilunar valves open. Ventricular volume now begins to fall.", connect: "The pressure threshold is higher on the left because systemic resistance is higher." },
  { stage: "Eject", title: "Ventricular ejection", cue: "Pressure becomes forward flow.", detail: "Blood leaves rapidly at first, then more slowly as contraction wanes. The blood remaining after ejection is the end-systolic volume.", connect: "Stroke volume equals end-diastolic volume minus end-systolic volume." },
  { stage: "Close", title: "Semilunar valves close — S2", cue: "The arteries briefly become the higher-pressure chamber.", detail: "As ventricular pressure falls below arterial pressure, the aortic and pulmonary valves close. All valves are again closed during isovolumetric relaxation.", connect: "Semilunar-valve closure produces the second heart sound, S2." },
  { stage: "Reset", title: "Relax and refill", cue: "The loop resets when ventricular pressure falls below atrial pressure.", detail: "The AV valves open, rapid filling begins, and a new cycle starts. Volume changes only while an inlet or outlet valve is open.", connect: "This repeating relationship lets you predict valve state from pressure alone." },
];

const recallQuestions: RecallQuestion[] = [
  { q: "What closes the AV valves?", a: "Ventricular pressure rising above atrial pressure." },
  { q: "Why is contraction called isovolumetric at first?", a: "All valves are closed, so pressure rises while ventricular volume stays constant." },
  { q: "What event produces S2?", a: "Closure of the aortic and pulmonary valves as ventricular pressure falls below arterial pressure." },
];

export function LessonWorkspace() {
  return <ProfessorLessonWorkspace
    lessonSlug="cardiac-cycle"
    title="The cardiac cycle"
    subtitle="Use pressure to predict every valve movement, volume change, and heart sound."
    mapTitle="One heartbeat, left to right"
    notesLabel="My cardiac-cycle notes"
    notesPlaceholder={'Pressure drives valve movement.\n\nDuring filling...\n\nWhat I still need to clarify...'}
    steps={lessonSteps}
    recallQuestions={recallQuestions}
    nextLesson={{ href: "/learn/cardiovascular/cardiac-output", label: "Continue to cardiac output" }}
  />;
}
