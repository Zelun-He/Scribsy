import type { SOAPNote } from "@/types";

export interface TranscriptLine {
  time?: string;
  speaker?: string;
  text: string;
}

export const SAMPLE_TRANSCRIPT: TranscriptLine[] = [
  { time: "00:12", speaker: "Clinician", text: "What brings you in?" },
  {
    time: "00:15",
    speaker: "Patient",
    text: "I rolled my right ankle playing basketball Saturday. It’s swollen and hurts to walk on.",
  },
  {
    time: "00:31",
    speaker: "Clinician",
    text: "Any numbness or tingling in the foot?",
  },
  {
    time: "00:34",
    speaker: "Patient",
    text: "No, it’s just sore on the outside.",
  },
  {
    time: "02:47",
    speaker: "Clinician",
    text: "Tender over the lateral ligament. No tenderness at the malleolus or the fifth metatarsal.",
  },
  {
    time: "04:12",
    speaker: "Clinician",
    text: "This is a lateral ankle sprain. The Ottawa ankle rules are negative. Rest, ice, compression and elevation; anti-inflammatory medication as tolerated and an ankle brace. Come back if you can’t bear weight or it hasn’t improved in one to two weeks.",
  },
];

export const SAMPLE_SOAP: SOAPNote = {
  subjective:
    "34-year-old reports right ankle inversion injury 2 days ago. Lateral swelling, pain with weight-bearing. Denies numbness or tingling.",
  objective:
    "Swelling and tenderness over right ATFL. No bony tenderness at posterior malleolus or base of 5th metatarsal.",
  assessment: "Right lateral ankle sprain. Ottawa ankle rules negative.",
  plan: "RICE, NSAIDs as tolerated, ankle brace. Return if unable to bear weight or no improvement in 1–2 weeks.",
};

export const SOAP_SECTIONS = [
  { key: "subjective", letter: "S", title: "Subjective" },
  { key: "objective", letter: "O", title: "Objective" },
  { key: "assessment", letter: "A", title: "Assessment" },
  { key: "plan", letter: "P", title: "Plan" },
] as const;
