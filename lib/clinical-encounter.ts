export type EncounterSourceState = "supported" | "scaffold" | "locked";

export type EncounterStep = {
  id: string;
  lessonSlug: "cardiac-cycle" | "cardiac-output";
  stage: "History" | "Examination" | "Investigations" | "Differential" | "Management" | "Communication";
  scene: string;
  prompt: string;
  options: string[];
  correctOption: number;
  correction: string;
  sourceLabel: string;
  sourceState: EncounterSourceState;
};

export const clinicalEncounter = {
  id: "forward-flow-encounter-01",
  title: "The low-flow handover",
  subtitle: "A six-stage encounter that separates supported physiology from clinical unknowns",
  scope: "Cardiac cycle and cardiac output foundations only",
  steps: [
    {
      id: "encounter-history-boundary",
      lessonSlug: "cardiac-output",
      stage: "History",
      scene: "A simulated patient says, “I tire sooner than usual.” No diagnosis, examination finding, or approved disease chapter is available.",
      prompt: "What is the safest first reasoning move?",
      options: ["Name the most likely disease immediately", "Clarify the symptom and keep diagnostic claims open", "Assume stroke volume is low", "Choose treatment before examining the patient"],
      correctOption: 1,
      correction: "Clarify the observation before assigning a mechanism. The symptom is scenario information, not evidence for a diagnosis.",
      sourceLabel: "Reasoning safeguard · observation before inference",
      sourceState: "scaffold",
    },
    {
      id: "encounter-exam-observation",
      lessonSlug: "cardiac-cycle",
      stage: "Examination",
      scene: "For this simulation, the pulse is supplied as regular at 100/min. No other examination finding has been source-approved.",
      prompt: "Which statement stays inside the available evidence?",
      options: ["The regular pulse proves normal cardiac output", "The rate can enter the output calculation, but stroke volume is still needed", "The patient has a specific rhythm disorder", "The pulse alone identifies the cause"],
      correctOption: 1,
      correction: "Heart rate is one part of CO = HR × SV. A rate alone cannot establish output, mechanism, or diagnosis.",
      sourceLabel: "Cardiac output · CO = HR × SV",
      sourceState: "supported",
    },
    {
      id: "encounter-investigation-calc",
      lessonSlug: "cardiac-output",
      stage: "Investigations",
      scene: "A teaching measurement supplies a stroke volume of 45 mL with the same heart rate of 100/min.",
      prompt: "What cardiac output follows from the supplied values?",
      options: ["0.45 L/min", "4.5 L/min", "45 L/min", "145 L/min"],
      correctOption: 1,
      correction: "CO = HR × SV = 100 × 45 = 4,500 mL/min, or 4.5 L/min.",
      sourceLabel: "Cardiac output · calculation",
      sourceState: "supported",
    },
    {
      id: "encounter-differential-mechanism",
      lessonSlug: "cardiac-output",
      stage: "Differential",
      scene: "The teaching model now raises afterload while holding the other starting conditions constant.",
      prompt: "Which immediate mechanism belongs in the differential reasoning?",
      options: ["Ejection becomes easier and ESV falls", "Ejection is opposed, ESV tends to rise, and SV tends to fall", "The change proves a named disease", "Valve timing becomes independent of pressure"],
      correctOption: 1,
      correction: "An acute rise in afterload opposes ejection, tending to increase end-systolic volume and reduce stroke volume. It does not, by itself, prove a disease.",
      sourceLabel: "Cardiac output · afterload pattern",
      sourceState: "supported",
    },
    {
      id: "encounter-management-gate",
      lessonSlug: "cardiac-output",
      stage: "Management",
      scene: "You are asked to choose patient-specific treatment, but no approved diagnosis or management source has been attached.",
      prompt: "What should Poh-tah-toh do next?",
      options: ["Invent a treatment pathway", "Reuse a treatment from another condition", "Stop, request the matching approved source, and use clinical supervision", "Treat the physiology calculation as a prescription"],
      correctOption: 2,
      correction: "Patient-specific management remains locked. Add and approve the matching clinical source, then review the decision with appropriate supervision.",
      sourceLabel: "Source gate · approved clinical management evidence required",
      sourceState: "locked",
    },
    {
      id: "encounter-communication-boundary",
      lessonSlug: "cardiac-output",
      stage: "Communication",
      scene: "The simulated patient asks what the available information means.",
      prompt: "Which explanation is accurate without overclaiming?",
      options: ["We know your exact diagnosis", "The supplied numbers let us calculate flow, but they do not identify a diagnosis or treatment by themselves", "The calculation proves no further assessment is needed", "A raised heart rate always identifies the cause"],
      correctOption: 1,
      correction: "Explain what the calculation supports and name what remains unknown. Clear uncertainty is part of safe clinical communication.",
      sourceLabel: "Communication safeguard · explain evidence and uncertainty",
      sourceState: "scaffold",
    },
  ] satisfies EncounterStep[],
};

