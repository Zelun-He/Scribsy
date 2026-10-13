import type { User } from "@/types";
import { previewDashboard } from "./dashboard";

// This marker grants access to public fictional data only. It is never a real-account credential.
export const DEMO_TOKEN = "scribsy-public-demo-v1";
export const DEMO_USER: User = {
  id: 0,
  username: "testuser",
  email: "public-demo@scribsy.example",
  is_active: true,
  is_admin: false,
  is_demo: true,
  role: "read_only",
  tenant_id: "scribsy-public-demo",
  timezone: "America/Chicago",
};

export function demoDashboard() {
  const data = previewDashboard();
  const names = [
    ["Avery", "Morgan"],
    ["Jordan", "Ellis"],
    ["Taylor", "Reed"],
  ];
  data.patients.forEach((patient, index) => {
    [patient.first_name, patient.last_name] = names[index];
    patient.address = "Fictional demo patient — not a real medical record.";
  });
  data.notes.forEach((note) => {
    const patient = data.patients.find((p) => p.id === note.patient_id)!;
    note.patient_first_name = patient.first_name;
    note.patient_last_name = patient.last_name;
    if (["finalized", "signed", "completed"].includes(note.status)) {
      note.soap_objective ||= "Fictional examination reviewed.";
      note.soap_assessment ||= "Fictional assessment reviewed.";
    }
    const source = "Fictional demonstration visit. " + note.content;
    note.transcript ||= source;
    note.content =
      source +
      (note.soap_subjective
        ? `\n\n=== GENERATED SOAP NOTE ===\nSubjective: ${note.soap_subjective}\n\nObjective: ${note.soap_objective || ""}\n\nAssessment: ${note.soap_assessment || ""}\n\nPlan: ${note.soap_plan || ""}`
        : "");
  });
  // Relative times keep the view useful even when no separate backend is running.
  const now = Date.now();
  data.appointments.forEach((appointment, index) => {
    appointment.scheduled_at = new Date(
      now + (20 + index * 40) * 60000,
    ).toISOString();
    appointment.title = "Demo follow-up";
    appointment.notified = true;
    appointment.notify_before_minutes = 0;
  });
  return data;
}
