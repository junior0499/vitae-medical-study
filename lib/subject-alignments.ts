export type CurriculumSubject = "Internal Medicine I" | "Perioperative Medicine I" | "Women & Child Health I";
export type AlignmentStatus = "strong" | "partial" | "review" | "missing";

export type CurriculumAlignment = {
  id: string;
  subject: CurriculumSubject;
  system: string;
  week: string;
  number: string;
  topic: string;
  primary: string;
  pages: string;
  support: string;
  status: AlignmentStatus;
  note: string;
};

const sourceCheck = "Exact chapter and page need confirmation from an uploaded table of contents or book section.";

export const perioperativeAlignments: CurriculumAlignment[] = [
  { id: "pm-1-1", subject: "Perioperative Medicine I", system: "Surgery", week: "I", number: "1", topic: "Surgical pathologies of the head and neck: thyroid and parathyroid", primary: "Schwartz’s Principles of Surgery · 9th/11th edition", pages: "Chapter/page check needed", support: "Course-mandated Schwartz reading", status: "review", note: sourceCheck },
  { id: "pm-1-2", subject: "Perioperative Medicine I", system: "Surgery", week: "I", number: "2", topic: "Surgical pathologies of the chest, lungs, mediastinum and pleura", primary: "Schwartz’s Principles of Surgery · 9th/11th edition", pages: "Chapter/page check needed", support: "Course-mandated Schwartz reading", status: "review", note: sourceCheck },
  { id: "pm-1-3", subject: "Perioperative Medicine I", system: "Rehabilitation", week: "I", number: "3", topic: "Rehabilitation approaches for acute traumatic musculoskeletal disorders", primary: "Physical and Rehabilitation Medicine for Medical Students · 2014", pages: "Chapter/page check needed", support: "Ceravolo & Christodoulou", status: "review", note: sourceCheck },
  { id: "pm-2-1", subject: "Perioperative Medicine I", system: "Orthopaedics", week: "II", number: "1", topic: "Introduction to orthopaedics: examination, soft tissue and cartilage", primary: "Evidence-Based Orthopedics · 1st edition", pages: "Chapter/page check needed", support: "Campbell 11e; Apley 9e", status: "review", note: sourceCheck },
  { id: "pm-2-2", subject: "Perioperative Medicine I", system: "Trauma", week: "II", number: "2", topic: "Trauma, polytrauma and immobilization with plaster casting", primary: "Evidence-Based Orthopedics · 1st edition", pages: "Chapter/page check needed", support: "Campbell 11e; Apley 9e; Rockwood 7e", status: "review", note: sourceCheck },
  { id: "pm-2-3", subject: "Perioperative Medicine I", system: "Orthopaedics", week: "II", number: "3", topic: "Fractures: diagnosis, treatment, osteosynthesis and consolidation", primary: "Evidence-Based Orthopedics · 1st edition", pages: "Chapter/page check needed", support: "Campbell 11e; Apley 9e; Rockwood 7e", status: "review", note: sourceCheck },
  { id: "pm-2-5", subject: "Perioperative Medicine I", system: "Orthopaedics", week: "II", number: "5", topic: "Traumatic injuries of the shoulder girdle and forearm", primary: "Evidence-Based Orthopedics · 1st edition", pages: "Chapter/page check needed", support: "Campbell 11e; Apley 9e; Rockwood 7e", status: "review", note: sourceCheck },
  { id: "pm-2-7", subject: "Perioperative Medicine I", system: "Orthopaedics", week: "II", number: "7", topic: "Traumatic injuries of the pelvis and lower extremities", primary: "Evidence-Based Orthopedics · 1st edition", pages: "Chapter/page check needed", support: "Campbell 11e; Apley 9e; Rockwood 7e", status: "review", note: sourceCheck },
  { id: "pm-2-8", subject: "Perioperative Medicine I", system: "Trauma", week: "II", number: "8", topic: "Spinal cord injuries and congenital musculoskeletal injuries", primary: "Evidence-Based Orthopedics · 1st edition", pages: "Chapter/page check needed", support: "Campbell 11e; Apley 9e; Rockwood 7e", status: "review", note: "The syllabus groups traumatic and congenital material; confirm whether these should become separate lessons. " + sourceCheck },
  { id: "pm-3-cbl", subject: "Perioperative Medicine I", system: "Clinical cases", week: "III", number: "CBL", topic: "Perioperative case-based discussions", primary: "Lecturer-provided cases", pages: "Not uploaded", support: "No textbook case set specified", status: "missing", note: "Upload the lecturer’s cases before producing source-locked case lessons." },
];

export const womenChildAlignments: CurriculumAlignment[] = [
  { id: "wc-1-1", subject: "Women & Child Health I", system: "Obstetrics", week: "I", number: "1", topic: "Pregnancy foundations: implantation, placental development and preconception counselling", primary: "Williams Obstetrics · 25th edition", pages: "Chapter/page check needed", support: "Dewhurst’s Obstetrics and Gynaecology · 8e", status: "review", note: sourceCheck },
  { id: "wc-1-2", subject: "Women & Child Health I", system: "Obstetrics", week: "I", number: "2", topic: "The fetal patient: imaging, amniotic fluid, genetics, prenatal diagnosis and therapy", primary: "Williams Obstetrics · 25th edition", pages: "Chapter/page check needed", support: "Dewhurst 8e", status: "review", note: sourceCheck },
  { id: "wc-1-3", subject: "Women & Child Health I", system: "Obstetrics", week: "I", number: "3", topic: "Teratology, drugs in pregnancy, alloimmunization and hydrops fetalis", primary: "Williams Obstetrics · 25th edition", pages: "Chapter/page check needed", support: "Dewhurst 8e", status: "review", note: sourceCheck },
  { id: "wc-2-4", subject: "Women & Child Health I", system: "Obstetrics", week: "II", number: "4", topic: "Medical complications of pregnancy: diabetes, hypertension, renal, endocrine, cardiac and infectious disorders", primary: "Williams Obstetrics · 25th edition", pages: "Chapter/page check needed", support: "Dewhurst 8e", status: "review", note: sourceCheck },
  { id: "wc-2-5", subject: "Women & Child Health I", system: "Obstetrics", week: "II", number: "5", topic: "Obstetric hemorrhage: placenta previa and placental abruption", primary: "Williams Obstetrics · 25th edition", pages: "Chapter/page check needed", support: "Dewhurst 8e", status: "review", note: sourceCheck },
  { id: "wc-2-6", subject: "Women & Child Health I", system: "Obstetrics", week: "II", number: "6", topic: "Preterm labor and postterm pregnancy", primary: "Williams Obstetrics · 25th edition", pages: "Chapter/page check needed", support: "Dewhurst 8e", status: "review", note: sourceCheck },
  { id: "wc-3-7", subject: "Women & Child Health I", system: "Obstetrics", week: "III", number: "7", topic: "Obstetric analgesia and anesthesia", primary: "Williams Obstetrics · 25th edition", pages: "Chapter/page check needed", support: "Dewhurst 8e", status: "review", note: sourceCheck },
  { id: "wc-3-8", subject: "Women & Child Health I", system: "Obstetrics", week: "III", number: "8", topic: "Normal and abnormal labor, intrapartum assessment, induction and postpartum period", primary: "Williams Obstetrics · 25th edition", pages: "Chapter/page check needed", support: "Dewhurst 8e", status: "review", note: sourceCheck },
  { id: "wc-3-9", subject: "Women & Child Health I", system: "Obstetrics", week: "III", number: "9", topic: "Operative delivery: vaginal delivery, cesarean, hysterectomy, breech and cerclage", primary: "Williams Obstetrics · 25th edition", pages: "Chapter/page check needed", support: "Dewhurst 8e", status: "review", note: sourceCheck },
  { id: "wc-4-1", subject: "Women & Child Health I", system: "Pediatrics", week: "IV", number: "1", topic: "Pediatric basics: age periods, fetal growth factors and growth retardation", primary: "Nelson Textbook of Pediatrics · 21st edition", pages: "Chapter/page check needed", support: "Oxford Handbook of Pediatrics · 2e", status: "review", note: sourceCheck },
  { id: "wc-4-2", subject: "Women & Child Health I", system: "Human development", week: "IV", number: "2", topic: "Vygotsky’s developmental theory and social policy", primary: "Child Development · 9th edition", pages: "Chapter/page check needed", support: "Berk", status: "review", note: sourceCheck },
  { id: "wc-4-3", subject: "Women & Child Health I", system: "Neonatology", week: "IV", number: "3", topic: "Newborn anatomy, physiology, screening and routine care", primary: "Nelson Textbook of Pediatrics · 21st edition", pages: "Chapter/page check needed", support: "Oxford Handbook of Neonatology 2e; Neonatology at a Glance 3e", status: "review", note: sourceCheck },
  { id: "wc-4-4", subject: "Women & Child Health I", system: "Human development", week: "IV", number: "4", topic: "Infancy: biological foundations, prenatal development and early motor-perceptual skills", primary: "Child Development · 9th edition", pages: "Chapter/page check needed", support: "Berk", status: "review", note: sourceCheck },
  { id: "wc-4-5", subject: "Women & Child Health I", system: "Neonatology", week: "IV", number: "5", topic: "Neonatal jaundice, hyperbilirubinemia and hemolytic disease", primary: "Nelson Textbook of Pediatrics · 21st edition", pages: "Chapter/page check needed", support: "Oxford Handbook of Neonatology 2e; Neonatology at a Glance 3e", status: "review", note: sourceCheck },
  { id: "wc-4-6", subject: "Women & Child Health I", system: "Human development", week: "IV", number: "6", topic: "Physical growth, motor skills and youth sports", primary: "Child Development · 9th edition", pages: "Chapter/page check needed", support: "Nelson 21e", status: "review", note: sourceCheck },
  { id: "wc-5-7", subject: "Women & Child Health I", system: "Neonatology", week: "V", number: "7", topic: "Neonatal skin and umbilical disease, sepsis and TORCH infections", primary: "Nelson Textbook of Pediatrics · 21st edition", pages: "Chapter/page check needed", support: "Oxford Handbook of Neonatology 2e; Neonatology at a Glance 3e", status: "review", note: sourceCheck },
  { id: "wc-5-8", subject: "Women & Child Health I", system: "Human development", week: "V", number: "8", topic: "Piaget and Vygotsky, object permanence and imitation", primary: "Child Development · 9th edition", pages: "Chapter/page check needed", support: "Berk", status: "review", note: sourceCheck },
  { id: "wc-5-9", subject: "Women & Child Health I", system: "Pediatrics", week: "V", number: "9", topic: "Growth and development assessment across physical, motor and social domains", primary: "Nelson Textbook of Pediatrics · 21st edition", pages: "Chapter/page check needed", support: "Child Development 9e", status: "review", note: sourceCheck },
  { id: "wc-5-10", subject: "Women & Child Health I", system: "Human development", week: "V", number: "10", topic: "Information processing, cognitive retention and brain-function change", primary: "Child Development · 9th edition", pages: "Chapter/page check needed", support: "Berk", status: "review", note: sourceCheck },
  { id: "wc-5-11", subject: "Women & Child Health I", system: "Pediatrics", week: "V", number: "11", topic: "Objective pediatric examination, anthropometry and immunization principles", primary: "Nelson Textbook of Pediatrics · 21st edition", pages: "Chapter/page check needed", support: "Pediatric Physical Examination 3e", status: "review", note: sourceCheck },
  { id: "wc-5-12", subject: "Women & Child Health I", system: "Human development", week: "V", number: "12", topic: "Sternberg’s theories, intelligence testing and early intervention", primary: "Child Development · 9th edition", pages: "Chapter/page check needed", support: "Berk", status: "review", note: sourceCheck },
  { id: "wc-6-13", subject: "Women & Child Health I", system: "Pediatrics", week: "VI", number: "13", topic: "Hip dysplasia, rickets and spasmophilia", primary: "Nelson Textbook of Pediatrics · 21st edition", pages: "Chapter/page check needed", support: "Oxford Handbook of Pediatrics 2e", status: "review", note: sourceCheck },
  { id: "wc-6-14", subject: "Women & Child Health I", system: "Human development", week: "VI", number: "14", topic: "Speech development, sensitive periods and grammar acquisition", primary: "Child Development · 9th edition", pages: "Chapter/page check needed", support: "Berk", status: "review", note: sourceCheck },
  { id: "wc-6-15", subject: "Women & Child Health I", system: "Pediatrics", week: "VI", number: "15", topic: "Breastfeeding, artificial feeding and introduction of solids", primary: "Nelson Textbook of Pediatrics · 21st edition", pages: "Chapter/page check needed", support: "Oxford Handbook of Pediatrics 2e", status: "review", note: sourceCheck },
  { id: "wc-6-16", subject: "Women & Child Health I", system: "Human development", week: "VI", number: "16", topic: "Emotional expression, self-regulation and attachment", primary: "Child Development · 9th edition", pages: "Chapter/page check needed", support: "Berk", status: "review", note: sourceCheck },
  { id: "wc-6-17", subject: "Women & Child Health I", system: "Neonatology", week: "VI", number: "17", topic: "Birth injuries: cephalohematoma, nerve damage and intracerebral hemorrhage", primary: "Nelson Textbook of Pediatrics · 21st edition", pages: "Chapter/page check needed", support: "Oxford Handbook of Neonatology 2e", status: "review", note: sourceCheck },
  { id: "wc-6-18", subject: "Women & Child Health I", system: "Human development", week: "VI", number: "18", topic: "Self-esteem, gender roles and peer relationships", primary: "Child Development · 9th edition", pages: "Chapter/page check needed", support: "Berk", status: "review", note: sourceCheck },
  { id: "wc-7-cbl", subject: "Women & Child Health I", system: "Clinical cases", week: "VII", number: "CBL", topic: "Maternal and child health case-based discussions", primary: "Lecturer-provided cases", pages: "Not uploaded", support: "No case set specified in the syllabus", status: "missing", note: "Upload the lecturer’s cases before producing source-locked case lessons." },
];

const internalTopics: Array<[string, string, string, string]> = [
  ["cv-1-1", "Cardiovascular", "I", "Approach to the patient, cardiovascular examination and ECG"],
  ["cv-1-2", "Cardiovascular", "I", "Cardiac imaging and invasive investigation"],
  ["cv-1-3", "Cardiovascular", "I", "Electrophysiology, bradyarrhythmias and tachyarrhythmias"],
  ["cv-1-4", "Cardiovascular", "I", "Normal myocardial function, heart failure and pulmonary hypertension"],
  ["cv-2-5", "Cardiovascular", "II", "Heart transplantation and congenital heart disease in adults"],
  ["cv-2-6", "Cardiovascular", "II", "Valvular diseases of the heart"],
  ["cv-2-7", "Cardiovascular", "II", "Cardiomyopathy, myocarditis, endocarditis and pericardial disease"],
  ["cv-2-8", "Cardiovascular", "II", "Cardiac tumors, systemic manifestations and cardiac trauma"],
  ["cv-3-9", "Cardiovascular", "III", "Atherosclerosis and ischemic heart disease"],
  ["cv-3-10", "Cardiovascular", "III", "Unstable angina, NSTEMI and STEMI"],
  ["cv-3-11", "Cardiovascular", "III", "PCI and hypertensive vascular disease"],
  ["cv-3-12", "Cardiovascular", "III", "Aortic and peripheral vascular disease"],
  ["rs-4-1", "Respiratory", "IV", "Approach to dyspnea, cough and hemoptysis"],
  ["rs-4-2", "Respiratory", "IV", "Asthma"],
  ["rs-4-3", "Respiratory", "IV", "COPD and emphysema"],
  ["rs-4-4", "Respiratory", "IV", "Acute bronchitis"],
  ["rs-4-5", "Respiratory", "IV", "Pneumonia"],
  ["rs-4-6", "Respiratory", "IV", "Lung abscess and bronchiectasis"],
  ["rs-5-7", "Respiratory", "V", "Pulmonary tuberculosis"],
  ["rs-5-8", "Respiratory", "V", "Granulomatosis with polyangiitis and related disease"],
  ["rs-5-9", "Respiratory", "V", "Occupational disease, sarcoidosis and cystic fibrosis"],
  ["rs-5-10", "Respiratory", "V", "Idiopathic fibrotic and interstitial lung disease"],
  ["rs-5-11", "Respiratory", "V", "ARDS and lung neoplasms"],
  ["rs-5-12", "Respiratory", "V", "Pleural disease, pneumothorax and pulmonary embolism"],
  ["rn-6-1", "Renal", "VI", "Renal anatomy, physiology and examination"],
  ["rn-6-2", "Renal", "VI", "UTI, nephrolithiasis, obstruction and polycystic kidney disease"],
  ["rn-6-3", "Renal", "VI", "Primary glomerulopathies"],
  ["rn-7-4", "Renal", "VII", "Secondary glomerulopathies"],
  ["rn-7-5", "Renal", "VII", "Acute kidney injury"],
  ["rn-7-6", "Renal", "VII", "CKD, renal replacement and transplantation"],
];

export type CoverageObjective = {
  id: string;
  subject: CurriculumSubject;
  system: string;
  week: string;
  topic: string;
  primarySource: string;
  mappingStatus: AlignmentStatus;
};

export const coverageObjectives: CoverageObjective[] = [
  ...internalTopics.map(([id, system, week, topic]) => ({ id, subject: "Internal Medicine I" as const, system, week, topic, primarySource: "Internal Medicine source map", mappingStatus: id === "rs-4-4" ? "missing" as const : "strong" as const })),
  ...[...perioperativeAlignments, ...womenChildAlignments].map((item) => ({ id: item.id, subject: item.subject, system: item.system, week: item.week, topic: item.topic, primarySource: item.primary, mappingStatus: item.status })),
];

export const subjectAlignments = [...perioperativeAlignments, ...womenChildAlignments];

export function findCoverageObjective(alignmentId: string) {
  return coverageObjectives.find((item) => item.id === alignmentId);
}
