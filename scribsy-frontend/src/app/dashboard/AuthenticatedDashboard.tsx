"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  Upload,
  PenLine,
  Search,
  CheckCircle2,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { useToast } from "@/lib/toast";
import {
  DashboardData,
  isFinalized,
  needsReview,
  parseDate,
  patientName,
  previewDashboard,
  sameDay,
  timeLabel,
  weekDays,
} from "@/lib/dashboard";
import type { Note } from "@/types";
import styles from "./dashboard.module.css";

const EMPTY: DashboardData = { patients: [], notes: [], appointments: [] };
const modes = [
  {
    value: "record",
    label: "Record visit",
    hint: "Mic, live in the room",
    icon: Mic,
  },
  {
    value: "upload",
    label: "Upload audio",
    hint: "MP3, WAV, M4A",
    icon: Upload,
  },
  {
    value: "type",
    label: "Type notes",
    hint: "Shorthand is fine",
    icon: PenLine,
  },
] as const;

export default function AuthenticatedDashboard({
  preview = false,
}: {
  preview?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { show } = useToast();
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"record" | "upload" | "type">("record");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [checkingIn, setCheckingIn] = useState(false);

  const refresh = useCallback(async () => {
    if (preview) {
      setData(previewDashboard());
      return;
    }
    if (!user) return;
    try {
      const snapshot = await apiClient.getDashboard();
      setData(snapshot);
      setError("");
      window.dispatchEvent(
        new CustomEvent("scribsy:review-count", {
          detail: snapshot.notes.filter(needsReview).length,
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [preview, user]);

  useEffect(() => {
    void refresh();
    const onFocus = () => {
      setNow(new Date());
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => {
      setNow(new Date());
      void refresh();
    }, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const patientMap = useMemo(
    () => new Map(data.patients.map((patient) => [patient.id, patient])),
    [data.patients],
  );
  const nextAppointment = data.appointments.find(
    (appt) =>
      parseDate(appt.scheduled_at) >= now &&
      !["cancelled", "completed"].includes(appt.status || ""),
  );
  const nextPatient = nextAppointment
    ? patientMap.get(nextAppointment.patient_id)
    : undefined;
  const activePatientId =
    selectedPatient ?? (nextPatient ? String(nextPatient.id) : "");
  const lastNote = nextPatient
    ? data.notes.find(
        (note) => note.patient_id === nextPatient.id && isFinalized(note),
      )
    : undefined;
  const reviewNotes = data.notes.filter(needsReview);
  const days = weekDays(selectedDay);
  const weekStart = weekDays(now)[0];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekly = data.notes.filter(
    (note) =>
      parseDate(note.created_at) >= weekStart &&
      parseDate(note.created_at) < weekEnd,
  );
  const edited = (note: Note) => (note.content_changes_count || 0) > 0;
  const stages = [
    {
      label: "Draft",
      hint: "Captured, ready to summarize",
      value: weekly.filter(
        (n) =>
          needsReview(n) &&
          !edited(n) &&
          ![
            n.soap_subjective,
            n.soap_objective,
            n.soap_assessment,
            n.soap_plan,
          ].some(Boolean),
      ).length,
      tone: "blue",
      filter: "draft",
    },
    {
      label: "Draft ready",
      hint: "SOAP generated",
      value: weekly.filter(
        (n) =>
          needsReview(n) &&
          !edited(n) &&
          [
            n.soap_subjective,
            n.soap_objective,
            n.soap_assessment,
            n.soap_plan,
          ].some(Boolean),
      ).length,
      tone: "amber",
      filter: "ready",
    },
    {
      label: "Edited",
      hint: "Changes saved",
      value: weekly.filter((n) => needsReview(n) && edited(n)).length,
      tone: "gray",
      filter: "edited",
    },
    {
      label: "Finalized",
      hint: "Locked & exportable",
      value: weekly.filter(isFinalized).length,
      tone: "green",
      filter: "finalized",
    },
  ];
  const finalized = data.notes.filter(isFinalized).length;
  const activeSince = new Date(now);
  activeSince.setMonth(activeSince.getMonth() - 24);
  const activePatients = new Set(
    data.notes
      .filter(
        (note) =>
          parseDate(note.created_at) >= activeSince || needsReview(note),
      )
      .map((note) => note.patient_id),
  ).size;
  const minutesSaved = data.notes.reduce(
    (total, note) => total + Math.max(0, note.time_saved_minutes || 0),
    0,
  );
  const daily = data.appointments.filter(
    (appt) =>
      sameDay(parseDate(appt.scheduled_at), selectedDay) &&
      appt.status !== "cancelled",
  );
  const searchText = query.trim().toLowerCase();
  const foundPatients = searchText
    ? data.patients
        .filter((p) => patientName(p).toLowerCase().includes(searchText))
        .slice(0, 4)
    : [];
  const foundNotes = searchText
    ? data.notes
        .filter((n) =>
          `${patientName(patientMap.get(n.patient_id))} ${n.content} ${n.note_type}`
            .toLowerCase()
            .includes(searchText),
        )
        .slice(0, 4)
    : [];
  const destination = (url: string) => (preview ? "/login" : url);
  const startNote = () => {
    const params = new URLSearchParams({ mode });
    if (activePatientId) params.set("patient_id", activePatientId);
    router.push(destination(`/notes/new?${params}`));
  };
  const checkIn = async () => {
    if (preview) {
      router.push("/login");
      return;
    }
    if (!nextAppointment) return;
    setCheckingIn(true);
    try {
      const updated = await apiClient.checkInAppointment(nextAppointment.id);
      setData((previous) => ({
        ...previous,
        appointments: previous.appointments.map((appt) =>
          appt.id === updated.id ? updated : appt,
        ),
      }));
      show("Patient checked in");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in failed.");
    } finally {
      setCheckingIn(false);
    }
  };
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
          <h1>
            {greeting}, {preview ? "Dr. Taylor" : user?.username}
          </h1>
        </div>
        <div className={styles.searchWrap}>
          <label className={styles.search}>
            <Search size={17} aria-hidden="true" />
            <input
              aria-label="Search patients or notes"
              placeholder="Search patients or notes"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
            />
          </label>
          {searchText && (
            <div className={styles.searchResults}>
              {foundPatients.map((patient) => (
                <Link
                  key={`patient-${patient.id}`}
                  href={destination(`/patients/${patient.id}`)}
                >
                  <span>Patient</span>
                  {patientName(patient)}
                </Link>
              ))}
              {foundNotes.map((note) => (
                <Link
                  key={`note-${note.id}`}
                  href={destination(`/notes/${note.id}`)}
                >
                  <span>Note · {note.note_type}</span>
                  {patientName(patientMap.get(note.patient_id))}
                </Link>
              ))}
              {!foundPatients.length && !foundNotes.length && (
                <p>No matching patients or notes.</p>
              )}
            </div>
          )}
        </div>
      </header>
      {error && (
        <div className={styles.error} role="alert">
          {error}
          <button
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}
      {loading ? (
        <div className={styles.loading} role="status">
          Loading your clinical workspace…
        </div>
      ) : (
        <>
          <div className={styles.topGrid}>
            <section
              className={styles.capture}
              aria-labelledby="capture-heading"
            >
              <h2 id="capture-heading">Start a clinical note</h2>
              <p>
                Capture the visit — Scribsy drafts the SOAP note for your
                review.
              </p>
              <div
                className={styles.modes}
                role="group"
                aria-label="Note capture method"
              >
                {modes.map((item) => (
                  <button 
                    key={item.value}
                    aria-pressed={mode === item.value}
                    className={mode === item.value ? styles.selectedMode : ""}
                    onClick={() => setMode(item.value)}
                  >
                    <item.icon size={16} aria-hidden="true" />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </button>
                ))}
              </div>
              <label className={styles.patientLabel} htmlFor="capture-patient">
                Patient
              </label>
              <div className={styles.launch}>
                <select
                  id="capture-patient"
                  value={activePatientId}
                  onChange={(event) => setSelectedPatient(event.target.value)}
                >
                  <option value="">
                    Select a patient or add one in the editor
                  </option>
                  {data.patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patientName(patient)}
                      {nextPatient?.id === patient.id && nextAppointment
                        ? ` · ${nextAppointment.title || "Visit"} ${timeLabel(nextAppointment.scheduled_at)}`
                        : ""}
                    </option>
                  ))}
                </select>
                <button className={styles.startButton} onClick={startNote}>
                  {mode === "record" ? (
                    <>
                      <span className={styles.recordDot} /> Start recording
                    </>
                  ) : mode === "upload" ? (
                    <>
                      <Upload size={15} /> Choose audio
                    </>
                  ) : (
                    <>
                      <PenLine size={15} /> Start typing
                    </>
                  )}
                </button>
              </div>
            </section>
            <section className={styles.nextUp} aria-labelledby="next-heading">
              <div className={styles.sectionTop}>
                <h2 id="next-heading" className={styles.eyebrow}>
                  Next up
                </h2>
                {nextAppointment && (
                  <span className={styles.nextBadge}>
                    in{" "}
                    {Math.max(
                      1,
                      Math.ceil(
                        (parseDate(nextAppointment.scheduled_at).getTime() -
                          now.getTime()) /
                          60000,
                      ),
                    )}{" "}
                    min
                  </span>
                )}
              </div>
              {nextAppointment && nextPatient ? (
                <>
                  <h3>{patientName(nextPatient)}</h3>
                  <p className={styles.muted}>
                    {nextAppointment.title || "Visit"} ·{" "}
                    {parseDate(nextAppointment.scheduled_at).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}{" "}
                    · {timeLabel(nextAppointment.scheduled_at)}
                  </p>
                  <div className={styles.lastVisit}>
                    <strong>
                      {lastNote
                        ? `Last visit · ${parseDate(lastNote.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "Patient chart"}
                    </strong>
                    <p>
                      {lastNote
                        ? `${lastNote.soap_subjective || lastNote.content.slice(0, 160)}${lastNote.soap_plan ? ` Plan: ${lastNote.soap_plan}` : ""}`
                        : "No finalized visit notes yet. Open the chart for patient details."}
                    </p>
                  </div>
                  <div className={styles.nextActions}>
                    <button
                      onClick={() => void checkIn()}
                      disabled={
                        checkingIn || nextAppointment.status === "checked_in"
                      }
                    >
                      {checkingIn
                        ? "Checking in…"
                        : nextAppointment.status === "checked_in"
                          ? "Checked in"
                          : "Check in"}
                    </button>
                    <Link href={destination(`/patients/${nextPatient.id}`)}>
                      Open chart
                    </Link>
                  </div>
                </>
              ) : (
                <div className={styles.empty}>
                  <CalendarDays size={23} />
                  <p>No upcoming appointments.</p>
                  <Link href={destination("/appointments/new")}>
                    Schedule a visit
                  </Link>
                </div>
              )}
            </section>
          </div>
          <section className={styles.weekCard} aria-labelledby="week-heading">
            <div className={styles.sectionTop}>
              <h2 id="week-heading">This week’s notes</h2>
              <span className={styles.muted}>From capture to finalized</span>
            </div>
            <div className={styles.stages}>
              {stages.map((stage) => (
                <Link
                  key={stage.label}
                  className={`${styles.stage} ${styles[stage.tone]}`}
                  href={destination(`/notes?filter=${stage.filter}&range=week`)}
                >
                  <strong>{stage.value}</strong>
                  <b>{stage.label}</b>
                  <small>{stage.hint}</small>
                </Link>
              ))}
            </div>
          </section>
          <div className={styles.bottomGrid}>
            <section
              className={styles.reviewCard}
              aria-labelledby="review-heading"
            >
              <div className={styles.reviewHeader}>
                <div>
                  <h2 id="review-heading">Needs your review</h2>
                  <p className={styles.muted}>
                    AI drafts aren’t part of the record until you finalize them.
                  </p>
                </div>
                <Link href={destination("/notes?filter=review")}>View all</Link>
              </div>
              {reviewNotes.length ? (
                reviewNotes.slice(0, 4).map((note) => {
                  const sections = [
                    note.soap_subjective,
                    note.soap_objective,
                    note.soap_assessment,
                    note.soap_plan,
                  ];
                  const hasSoap = sections.some(Boolean);
                  const missing = [
                    "Subjective",
                    "Objective",
                    "Assessment",
                    "Plan",
                  ].filter((_, index) => !sections[index]?.trim());
                  return (
                    <article className={styles.reviewRow} key={note.id}>
                      <div className={styles.reviewContent}>
                        <div className={styles.rowTitle}>
                          <h3>
                            {patientName(patientMap.get(note.patient_id))}
                          </h3>
                          <span
                            className={`${styles.status} ${hasSoap ? styles.amber : styles.blue}`}
                          >
                            {edited(note)
                              ? "Edited"
                              : hasSoap
                                ? "Draft ready"
                                : "Draft"}
                          </span>
                        </div>
                        <p className={styles.muted}>
                          {note.note_type} ·{" "}
                          {parseDate(note.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" },
                          )}{" "}
                          {timeLabel(note.created_at)}
                          {note.audio_file ? " · Audio attached" : ""}
                        </p>
                        <div
                          className={styles.soapFlags}
                          aria-label="SOAP section completeness"
                        >
                          {sections.map((section, index) => (
                            <span
                              key={index}
                              title={`${["Subjective", "Objective", "Assessment", "Plan"][index]}: ${section?.trim() ? "present" : "missing"}`}
                              className={
                                section?.trim()
                                  ? styles.complete
                                  : styles.missing
                              }
                            >
                              {["S", "O", "A", "P"][index]}
                            </span>
                          ))}
                        </div>
                        <p className={styles.excerpt}>
                          {hasSoap && missing.length
                            ? `${missing.join(", ")} ${missing.length === 1 ? "section is" : "sections are"} empty — review and complete before finalizing.`
                            : note.soap_subjective
                              ? `Subjective: ${note.soap_subjective}`
                              : note.transcript
                                ? "Transcript ready. Generate SOAP and review the draft."
                                : note.content ||
                                  "Open this draft to continue documenting."}
                        </p>
                      </div>
                      <Link
                        className={styles.primaryButton}
                        href={destination(`/notes/${note.id}`)}
                      >
                        Review draft
                      </Link>
                    </article>
                  );
                })
              ) : (
                <div className={styles.empty}>
                  <CheckCircle2 size={28} />
                  <h3>You’re all caught up</h3>
                  <p>New drafts will appear here for review.</p>
                </div>
              )}
            </section>
            <section
              className={styles.todayCard}
              aria-labelledby="today-heading"
            >
              <div className={styles.sectionTop}>
                <h2 id="today-heading">
                  {sameDay(selectedDay, now)
                    ? "Today"
                    : selectedDay.toLocaleDateString("en-US", {
                        weekday: "long",
                      })}
                </h2>
                <Link href={destination("/schedule")}>Schedule</Link>
              </div>
              <div
                className={styles.days}
                role="group"
                aria-label="Select schedule day"
              >
                {days.map((day) => (
                  <button
                    key={day.toISOString()}
                    aria-pressed={sameDay(day, selectedDay)}
                    aria-label={day.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                    className={
                      sameDay(day, selectedDay) ? styles.selectedDay : ""
                    }
                    onClick={() => setSelectedDay(day)}
                  >
                    <small>
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </small>
                    <strong>{day.getDate()}</strong>
                    <span>
                      {data.appointments.some(
                        (appt) =>
                          sameDay(parseDate(appt.scheduled_at), day) &&
                          appt.status !== "cancelled",
                      )
                        ? "•"
                        : "\u00a0"}
                    </span>
                  </button>
                ))}
              </div>
              <div className={styles.appointments}>
                {daily.length ? (
                  daily.map((appt) => (
                    <Link
                      className={styles.appointment}
                      key={appt.id}
                      href={destination(`/patients/${appt.patient_id}`)}
                    >
                      <time>{timeLabel(appt.scheduled_at)}</time>
                      <div>
                        <strong>
                          {patientName(patientMap.get(appt.patient_id))}
                        </strong>
                        <small>{appt.title || "Visit"}</small>
                      </div>
                      <span
                        className={`${styles.status} ${appt.status === "checked_in" ? styles.green : styles.gray}`}
                      >
                        {appt.status === "checked_in"
                          ? "Checked in"
                          : appt.id === nextAppointment?.id
                            ? "Next"
                            : "Visit"}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className={styles.empty}>
                    <p>No visits scheduled for this day.</p>
                    <Link href={destination("/appointments/new")}>
                      Add appointment
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>
          <section className={styles.metrics} aria-label="Practice totals">
            <Link href={destination("/notes")}>
              <h2>Notes generated</h2>
              <strong>{data.notes.length}</strong>
              <small>All time</small>
            </Link>
            <Link href={destination("/patients")}>
              <h2>Active patients</h2>
              <strong>{activePatients}</strong>
              <small>Seen in the last 24 months</small>
            </Link>
            <Link href={destination("/notes?filter=finalized")}>
              <h2>Finalized</h2>
              <strong>
                {finalized} <span>of {data.notes.length}</span>
              </strong>
              <progress
                aria-label="Finalized notes"
                value={finalized}
                max={Math.max(1, data.notes.length)}
              />
            </Link>
            <Link href={destination("/notes")}>
              <h2>Est. time saved</h2>
              <strong>{minutesSaved}m</strong>
              <small>
                {data.notes.some((note) => note.time_saved_minutes != null)
                  ? "Estimated from note timings"
                  : "No note timings recorded yet"}
              </small>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
