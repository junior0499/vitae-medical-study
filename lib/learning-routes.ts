export type RouteStep = {
  title: string;
  purpose: string;
  status: "live" | "mapped" | "source_needed";
  href?: string;
};

export type SubjectRoute = {
  id: string;
  code: string;
  subject: string;
  principle: string;
  steps: RouteStep[];
};

export const subjectRoutes: SubjectRoute[] = [
  {
    id: "internal-medicine",
    code: "IM",
    subject: "Internal Medicine I",
    principle: "Normal structure and function → examination and investigation → disease recognition → management reasoning",
    steps: [
      { title: "Cardiovascular foundations", purpose: "Flow, anatomy, conduction, cardiac cycle, output, pressure, coronary control, ECG, and examination.", status: "live", href: "/learn/cardiovascular/cardiac-cycle" },
      { title: "Clinical cardiology", purpose: "Heart failure, arrhythmias, valves, ischemia, cardiomyopathy, and vascular disease.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Respiratory foundations", purpose: "Airway structure, ventilation, perfusion, gas exchange, examination, and investigations.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Clinical respiratory medicine", purpose: "Asthma, COPD, infection, interstitial disease, pleura, embolism, and neoplasia.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Renal foundations and nephrology", purpose: "Filtration, tubular handling, fluid and acid-base control before renal syndromes.", status: "mapped", href: "/alignment#alignment-table" },
    ],
  },
  {
    id: "perioperative-medicine",
    code: "PM",
    subject: "Perioperative Medicine I",
    principle: "Assessment → operative problem → stabilization → tissue and fracture principles → recovery",
    steps: [
      { title: "Surgical assessment and preparation", purpose: "Patient assessment, risk, fluids, infection, wound healing, and safe preparation.", status: "source_needed", href: "/coverage" },
      { title: "Head, neck, chest, and pleural surgery", purpose: "Use the syllabus-mandated Schwartz route after chapter sections are confirmed.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Trauma and polytrauma", purpose: "Structured primary assessment, stabilization, immobilization, and secondary assessment.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Orthopaedics and fractures", purpose: "Examination, fracture diagnosis, consolidation, osteosynthesis, and regional injuries.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Rehabilitation and postoperative care", purpose: "Recovery, function, monitoring, complications, and safe discharge thinking.", status: "source_needed", href: "/library" },
    ],
  },
  {
    id: "women-child-health",
    code: "WC",
    subject: "Women & Child Health I",
    principle: "Reproductive and developmental foundations → normal transition → assessment → complication recognition",
    steps: [
      { title: "Pregnancy foundations", purpose: "Implantation, placenta, fetal assessment, prenatal diagnosis, teratology, and maternal physiology.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Pregnancy complications and labor", purpose: "Medical disorders, hemorrhage, preterm and postterm pregnancy, labor, and operative delivery.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Newborn transition and care", purpose: "Normal physiology, screening, feeding, jaundice, infection, and birth injury.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Pediatric assessment and growth", purpose: "Age-aware examination, anthropometry, immunization, nutrition, and common growth disorders.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Human development", purpose: "Motor, cognitive, language, emotional, attachment, identity, and peer development.", status: "mapped", href: "/alignment#alignment-table" },
      { title: "Maternal and child clinical cases", purpose: "Case practice begins after lecturer cases or an approved case source is uploaded.", status: "source_needed", href: "/library" },
    ],
  },
];
