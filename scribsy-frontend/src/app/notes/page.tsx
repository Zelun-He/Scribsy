"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { 
  DashboardData,
  isFinalized,
  needsReview,
  parseDate,
  patientName,
  weekDays,
} from "@/lib/dashboard";
import styles from "../dashboard/dashboard.module.css";

function NotesList() {
  const { user } = useAuth();
  const params = useSearchParams();
  const filter = params.get("filter") || "all";
  const weekly = params.get("range") === "week";
  const [data, setData] = useState<DashboardData>({
    notes: [],
    patients: [],
    appointments: [],
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setData(await apiClient.getDashboard());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notes");
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const notes = data.notes.filter((note) => {
    const hasSoap = [
      note.soap_subjective,
      note.soap_objective,
      note.soap_assessment,
      note.soap_plan,
    ].some(Boolean);
    const edited = (note.content_changes_count || 0) > 0;
    if (filter === "review" && !needsReview(note)) return false;
    if (filter === "draft" && !(needsReview(note) && !hasSoap && !edited))
      return false;
    if (filter === "ready" && !(needsReview(note) && hasSoap && !edited))
      return false;
    if (filter === "edited" && !(needsReview(note) && edited)) return false;
    if (filter === "finalized" && !isFinalized(note)) return false;
    if (weekly) {
      const start = weekDays(new Date())[0];
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      if (
        parseDate(note.created_at) < start ||
        parseDate(note.created_at) >= end
      )
        return false;
    }
    const text =
      `${patientName(data.patients.find((patient) => patient.id === note.patient_id))} ${note.note_type} ${note.content}`.toLowerCase();
    return text.includes(search.trim().toLowerCase());
  });
  const exportPDF = async (id: number) => {
    setBusy(id);
    try {
      const blob = await apiClient.exportNotePDF(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `note-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setBusy(null);
    }
  };
  if (!user) return null;
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {weekly ? "This week" : "Clinical documentation"}
          </p>
          <h1>{filter === "review" ? "Review queue" : "Notes history"}</h1>
        </div>
        <Link href="/notes/new?mode=type" className={styles.primaryButton}>
          <Plus size={15} className="inline mr-2" />
          New note
        </Link>
      </header>
      {error && (
        <div className={styles.error} role="alert">
          {error}
          <button onClick={() => void refresh()}>Retry</button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Link
          href="/notes"
          className={
            filter === "all" ? styles.primaryButton : "text-sm underline"
          }
        >
          All notes
        </Link>
        <Link
          href="/notes?filter=review"
          className={
            filter === "review" ? styles.primaryButton : "text-sm underline"
          }
        >
          Needs review
        </Link>
        <Link
          href="/notes?filter=finalized"
          className={
            filter === "finalized" ? styles.primaryButton : "text-sm underline"
          }
        >
          Finalized
        </Link>
        <label className={`${styles.search} ml-auto`}>
          <Search size={16} />
          <input
            aria-label="Search notes"
            placeholder="Search patient or note"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <section className={styles.reviewCard}>
        {loading ? (
          <p className={styles.loading} role="status">
            Loading your notes…
          </p>
        ) : notes.length ? (
          notes.map((note) => (
            <article key={note.id} className={styles.reviewRow}>
              <div className={styles.reviewContent}>
                <div className={styles.rowTitle}>
                  <h2>
                    {patientName(
                      data.patients.find(
                        (patient) => patient.id === note.patient_id,
                      ),
                    )}
                  </h2>
                  <span
                    className={`${styles.status} ${isFinalized(note) ? styles.green : styles.amber}`}
                  >
                    {note.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className={styles.muted}>
                  {note.note_type} ·{" "}
                  {parseDate(note.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className={`${styles.excerpt} mt-3`}>
                  {note.soap_subjective || note.content}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  className={styles.primaryButton}
                  href={`/notes/${note.id}`}
                >
                  {isFinalized(note) ? "View note" : "Review draft"}
                </Link>
                <button
                  onClick={() => void exportPDF(note.id)}
                  disabled={busy === note.id}
                  className="text-xs font-semibold underline"
                >
                  {busy === note.id ? "Exporting…" : "Export PDF"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className={styles.empty}>
            <h2>
              {search
                ? "No matching notes"
                : filter === "review"
                  ? "You’re all caught up"
                  : "No notes in this view"}
            </h2>
            <p>
              {search
                ? "Try another patient name or search term."
                : "Create a note or select another filter."}
            </p>
            <Link href="/notes/new?mode=type">Create a clinical note</Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading notes…</p>}>
      <NotesList />
    </Suspense>
  );
}
