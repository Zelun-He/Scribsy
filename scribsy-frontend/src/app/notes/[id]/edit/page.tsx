"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { isFinalized } from "@/lib/dashboard";
import { NoteEditor } from "@/components/notes/note-editor";
import type { Note } from "@/types";
import styles from "../../../dashboard/dashboard.module.css";

export default function EditNotePage() {
  const { user, loading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (authLoading || !user) return;
    apiClient
      .getNote(Number(id))
      .then(setNote)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load note"),
      );
  }, [id, user, authLoading]);
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
        (isFinalized(note) || user.is_demo) ? (
          <section className={styles.weekCard}>
            <h2>This note is read-only</h2>
            <p>
              Finalized notes are locked. You can view and export the signed
              record.
            </p>
            <Link href={`/notes/${id}`} className="underline">
              View note
            </Link>
          </section>
        ) : (
          <NoteEditor key={`${user.id}:${note.id}`} note={note} accountId={user.id} />
        )
      ) : (
        !error && <p role="status">Loading note…</p>
      )}
    </div>
  );
}
