"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { useToast } from "@/lib/toast";
import {
  DashboardData,
  parseDate,
  patientName,
  sameDay,
  timeLabel,
  weekDays,
} from "@/lib/dashboard";
import styles from "../dashboard/dashboard.module.css";

export default function SchedulePage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [data, setData] = useState<DashboardData>({
    patients: [],
    notes: [],
    appointments: [],
  });
  const [date, setDate] = useState(() => new Date());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setData(await apiClient.getDashboard());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load schedule");
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const changeWeek = (offset: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + offset * 7);
    setDate(next);
  };
  const daily = data.appointments.filter((appt) =>
    sameDay(parseDate(appt.scheduled_at), date),
  );
  const checkIn = async (id: number) => {
    setBusy(id);
    try {
      await apiClient.checkInAppointment(id);
      await refresh();
      show("Patient checked in");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setBusy(null);
    }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Delete this appointment?")) return;
    setBusy(id);
    try {
      await apiClient.deleteAppointment(id);
      await refresh();
      show("Appointment deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete appointment");
    } finally {
      setBusy(null);
    }
  };
  if (!user) return null;
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Your clinical workspace</p>
          <h1>Schedule</h1>
        </div>
        {!user.is_demo && (
          <Link href="/appointments/new" className={styles.primaryButton}>
            <Plus size={15} className="inline mr-2" />
            New appointment
          </Link>
        )}
      </header>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
          <button onClick={() => void refresh()}>Retry</button>
        </div>
      )}
      <section className={styles.todayCard}>
        <div className={styles.sectionTop}>
          <h2>
            {date.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={() => changeWeek(-1)} aria-label="Previous week">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setDate(new Date())}>Today</button>
            <button onClick={() => changeWeek(1)} aria-label="Next week">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className={styles.days}>
          {weekDays(date).map((day) => (
            <button
              key={day.toISOString()}
              aria-label={day.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              aria-pressed={sameDay(day, date)}
              className={sameDay(day, date) ? styles.selectedDay : ""}
              onClick={() => setDate(day)}
            >
              <small>
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </small>
              <strong>{day.getDate()}</strong>
              <span>
                {data.appointments.some((appt) =>
                  sameDay(parseDate(appt.scheduled_at), day),
                )
                  ? "•"
                  : "\u00a0"}
              </span>
            </button>
          ))}
        </div>
        <h2 className="mb-4">
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </h2>
        {loading ? (
          <p role="status">Loading appointments…</p>
        ) : daily.length ? (
          daily.map((appt) => (
            <div
              key={appt.id}
              className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] py-4"
            >
              <Link href={`/patients/${appt.patient_id}`}>
                <strong>
                  {timeLabel(appt.scheduled_at)} ·{" "}
                  {patientName(
                    data.patients.find(
                      (patient) => patient.id === appt.patient_id,
                    ),
                  )}
                </strong>
                <p className={styles.muted}>
                  {appt.title || "Visit"} ·{" "}
                  {appt.status?.replaceAll("_", " ") || "scheduled"}
                </p>
                {appt.note && <p>{appt.note}</p>}
              </Link>
              <div className="flex flex-wrap gap-3">
                <button
                  className={styles.primaryButton}
                  disabled={
                    !!user.is_demo ||
                    busy === appt.id ||
                    appt.status === "checked_in"
                  }
                  onClick={() => void checkIn(appt.id)}
                >
                  {appt.status === "checked_in"
                    ? "Checked in"
                    : busy === appt.id
                      ? "Saving…"
                      : "Check in"}
                </button>
                <Link
                  className={styles.primaryButton}
                  href={
                    user.is_demo
                      ? "/sample-visit"
                      : `/notes/new?patient_id=${appt.patient_id}&mode=type`
                  }
                >
                  {user.is_demo ? "Try sample visit" : "New note"}
                </Link>
                {!user.is_demo && (
                  <button
                    disabled={busy === appt.id}
                    className="text-red-600 text-xs"
                    onClick={() => void remove(appt.id)}
                  >
                    Delete appointment
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            <p>No appointments on this day.</p>
            <Link href="/appointments/new">Schedule a visit</Link>
          </div>
        )}
      </section>
    </div>
  );
}
