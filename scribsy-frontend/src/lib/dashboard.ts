import type { Appointment, Note, Patient } from "@/types";

export interface DashboardData {
  patients: Patient[];
  notes: Note[];
  appointments: Appointment[];
}

export const isFinalized = (note: Note) =>
  ["finalized", "signed", "completed"].includes(note.status) ||
  !!note.signed_at;
export const needsReview = (note: Note) =>
  !isFinalized(note) && note.status !== "cancelled";
export const patientName = (patient?: Patient) =>
  patient
    ? `${patient.first_name} ${patient.last_name}`
    : "Patient unavailable";
export const parseDate = (value: string) =>
  new Date(/(Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`);
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
export function weekDays(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}
export const timeLabel = (value: string) =>
  parseDate(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

// Public preview fixtures never enter the signed-in data path.
export function previewDashboard(): DashboardData {
  const now = new Date();
  const timestamp = (hours: number) =>
    new Date(now.getTime() - hours * 3600000).toISOString();
  const patients: Patient[] = [
    {
      id: 201,
      first_name: "Maria",
      last_name: "Delgado",
      date_of_birth: "1984-04-12",
      created_at: timestamp(400),
      updated_at: timestamp(24),
    },
    {
      id: 202,
      first_name: "James",
      last_name: "Okafor",
      date_of_birth: "1978-08-07",
      created_at: timestamp(400),
      updated_at: timestamp(2),
    },
    {
      id: 203,
      first_name: "Priya",
      last_name: "Raman",
      date_of_birth: "1992-01-20",
      created_at: timestamp(400),
      updated_at: timestamp(3),
    },
  ];
  const base = {
    provider_id: 0,
    visit_id: 1,
    created_at: timestamp(2),
    updated_at: timestamp(1),
    time_saved_minutes: 15,
  };
  const notes: Note[] = [
    {
      ...base,
      id: 101,
      patient_id: 202,
      note_type: "Consultation",
      status: "pending_review",
      content:
        "Reports intermittent lower back pain for 2 weeks, worse after long drives.",
      soap_subjective:
        "Reports intermittent lower back pain for 2 weeks, worse after long drives.",
      soap_objective: "Examination documented in the visit transcript.",
      soap_assessment: "Provider assessment ready for review.",
      soap_plan: "Follow-up plan ready for review.",
    },
    {
      ...base,
      id: 102,
      patient_id: 203,
      note_type: "Follow-up",
      status: "pending_review",
      content: "Follow-up visit documentation.",
      soap_subjective: "Follow-up visit documentation.",
      soap_objective: "Examination documented.",
      soap_assessment: "Assessment documented.",
    },
    {
      ...base,
      id: 103,
      patient_id: 201,
      note_type: "Follow-up",
      status: "draft",
      content: "Visit transcript ready to summarize.",
      transcript: "Visit transcript ready to summarize.",
    },
    ...[104, 105, 106].map((id, index) => ({
      ...base,
      id,
      patient_id: 201 + index,
      note_type: "Follow-up",
      status: "finalized",
      signed_at: timestamp(20),
      content: "Reviewed visit note.",
      created_at: timestamp(24 + index),
      soap_subjective: "Sore throat for 3 days with low-grade fever.",
      soap_plan: "Rapid strep; recheck if symptoms persist.",
    })),
  ];
  const at = (hour: number, minute = 0) => {
    const day = new Date(now);
    day.setHours(hour, minute, 0, 0);
    return day.toISOString();
  };
  const appointments: Appointment[] = [
    { id: 401, patient_id: 203, title: "Follow-up", scheduled_at: at(9) },
    {
      id: 402,
      patient_id: 202,
      title: "Consultation",
      scheduled_at: at(11, 30),
    },
    {
      id: 403,
      patient_id: 201,
      title: "Follow-up",
      scheduled_at: new Date(now.getTime() + 18 * 60000).toISOString(),
    },
  ].map((appt) => ({
    ...appt,
    user_id: 0,
    status: "scheduled",
    notify_before_minutes: 30,
    notified: false,
    created_at: timestamp(24),
    updated_at: timestamp(24),
  }));
  return { patients, notes, appointments };
}
