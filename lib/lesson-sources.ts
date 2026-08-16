export type LessonSource = {
  id: string;
  alignmentId: string;
  role: string;
  shortTitle: string;
  title: string;
  edition: string;
  chapter: string;
  pageReference: string;
  note: string;
};

export const lessonSourceRegistry: Record<string, LessonSource[]> = {
  "cardiac-cycle": [
    {
      id: "cardiac-cycle-braunwald",
      alignmentId: "foundation-03",
      role: "Primary physiology route",
      shortTitle: "BHD 12e",
      title: "Braunwald’s Heart Disease",
      edition: "12th edition",
      chapter: "Chapter 46",
      pageReference: "PDF p.1258",
      note: "Use for the pressure, valve, volume and heart-sound sequence.",
    },
    {
      id: "cardiac-cycle-harrison",
      alignmentId: "cv-1-4",
      role: "Clinical bridge",
      shortTitle: "HPIM 21e",
      title: "Harrison’s Principles of Internal Medicine",
      edition: "21st edition",
      chapter: "Chapter 237",
      pageReference: "PDF p.1840",
      note: "Connect normal pump function to the later heart-failure block.",
    },
  ],
  "cardiac-output": [
    {
      id: "cardiac-output-harrison",
      alignmentId: "foundation-04",
      role: "Primary physiology route",
      shortTitle: "HPIM 21e",
      title: "Harrison’s Principles of Internal Medicine",
      edition: "21st edition",
      chapter: "Chapter 237",
      pageReference: "PDF p.1840",
      note: "Use for cardiac output, stroke volume and their determinants.",
    },
    {
      id: "cardiac-output-braunwald",
      alignmentId: "cv-1-4",
      role: "Deeper mechanism",
      shortTitle: "BHD 12e",
      title: "Braunwald’s Heart Disease",
      edition: "12th edition",
      chapter: "Chapter 46",
      pageReference: "PDF p.1258",
      note: "Use when you are ready to connect loading conditions to pump performance.",
    },
  ],
};

export function getLessonSources(lessonSlug: string) {
  return lessonSourceRegistry[lessonSlug] ?? [];
}
