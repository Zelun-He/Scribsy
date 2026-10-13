"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { isFinalized } from "@/lib/dashboard";
import type { Note } from "@/types";
import styles from "../../../dashboard/dashboard.module.css";

const sections = [
  { key: "soap_subjective", label: "Subjective" },
  { key: "soap_objective", label: "Objective" },
  { key: "soap_assessment", label: "Assessment" },
  { key: "soap_plan", label: "Plan" },
] as const;

export default function EditNotePage() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (authLoading || !user) return;
    apiClient
      .getNote(Number(id))
      .then(setNote)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load note"),
      );
  }, [id, user, authLoading]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!note || isFinalized(note)) return;
    setSaving(true);
    setError("");
    try {
      await apiClient.updateNote(note.id, {
        content: note.content,
        soap_subjective: note.soap_subjective,
        soap_objective: note.soap_objective,
        soap_assessment: note.soap_assessment,
        soap_plan: note.soap_plan,
      });
      window.localStorage.removeItem(`soap_review_${note.id}`);
      router.push(`/notes/${note.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  };
  if (!user) return null;
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>Edit clinical note</h1>
        <Link href={`/notes/${id}`} className="underline">
          Back to note
        </Link>
      </header>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {note ? (
        isFinalized(note) ? (
          <section className={styles.weekCard}>
            <h2>This note is finalized</h2>
            <p>
              Finalized notes are locked. You can view and export the signed
              record.
            </p>
            <Link href={`/notes/${id}`} className="underline">
              View note
            </Link>
          </section>
        ) : (
          <form onSubmit={save} className={styles.weekCard}>
            <label className="block font-semibold mb-2" htmlFor="note-content">
              Visit notes
            </label>
            <textarea
              id="note-content"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6"
              rows={10}
              required
              value={note.content}
              onChange={(e) => setNote({ ...note, content: e.target.value })}
            />
            {sections.map((section) => (
              <div key={section.key} className="mb-5">
                <label
                  className="block font-semibold mb-2"
                  htmlFor={section.key}
                >
                  {section.label}
                </label>
                <textarea
                  id={section.key}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
                  rows={4}
                  value={note[section.key] || ""}
                  onChange={(e) =>
                    setNote({ ...note, [section.key]: e.target.value })
                  }
                />
              </div>
            ))}
            <button className={styles.primaryButton} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </form>
        )
      ) : (
        !error && <p role="status">Loading note…</p>
      )}
    </div>
  );
}
