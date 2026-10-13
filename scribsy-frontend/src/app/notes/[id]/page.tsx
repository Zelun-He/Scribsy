"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  FileText,
  LoaderCircle,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { isFinalized, parseDate } from "@/lib/dashboard";
import { SOAP_SECTIONS } from "@/lib/sample-visit";
import { ClinicalNote } from "@/components/notes/clinical-note";
import { ApprovalDialog } from "@/components/notes/approval-dialog";
import type { Note, NoteCode, NoteProvenance, SOAPNote } from "@/types";
import styles from "@/components/notes/note-workspace.module.css";

interface HistoryEntry {
  id: number;
  username: string;
  action: string;
  summary: string;
  created_at: string;
}
const noteSoap = (note: Note): SOAPNote => ({
  subjective: note.soap_subjective || "",
  objective: note.soap_objective || "",
  assessment: note.soap_assessment || "",
  plan: note.soap_plan || "",
});
const sourceContent = (note: Note) =>
  note.content.split("=== GENERATED SOAP NOTE ===")[0].trim();
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { show } = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [codes, setCodes] = useState<NoteCode[]>([]);
  const [provenance, setProvenance] = useState<NoteProvenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedSoap, setEditedSoap] = useState<SOAPNote>({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });
  const [content, setContent] = useState("");
  const [approved, setApproved] = useState<
    Partial<Record<keyof SOAPNote, boolean>>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [playingSnippet, setPlayingSnippet] = useState<number | null>(null);
  const snippetRef = useRef<HTMLAudioElement | null>(null);
  const snippetUrlRef = useRef("");

  useEffect(
    () => () => {
      snippetRef.current?.pause();
      if (snippetUrlRef.current) URL.revokeObjectURL(snippetUrlRef.current);
      snippetRef.current = null;
      snippetUrlRef.current = "";
    },
    [id],
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const saved = await apiClient.getNote(Number(id));
      setNote(saved);
      setContent(sourceContent(saved));
      setEditedSoap(noteSoap(saved));
      setApproved({});
      setError("");
      const extras = await Promise.allSettled([
        apiClient.getNoteHistory(saved.id),
        apiClient.listCodes(saved.id),
        apiClient.listProvenance(saved.id),
      ]);
      if (extras[0].status === "fulfilled") setHistory(extras[0].value);
      if (extras[1].status === "fulfilled") setCodes(extras[1].value);
      if (extras[2].status === "fulfilled") setProvenance(extras[2].value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this note.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);
  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, refresh]);
  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  const save = async () => {
    if (!note) return;
    setBusy("save");
    setError("");
    try {
      await apiClient.updateNote(note.id, {
        content,
        soap_subjective: editedSoap.subjective,
        soap_objective: editedSoap.objective,
        soap_assessment: editedSoap.assessment,
        soap_plan: editedSoap.plan,
      });
      setEditing(false);
      await refresh();
      show("Changes saved. Review the updated draft.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setBusy(null);
    }
  };
  const generateSoap = async () => {
    if (!note) return;
    setBusy("generate");
    setError("");
    try {
      await apiClient.generateSoap(note.id);
      await refresh();
      show("SOAP draft generated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate SOAP.");
    } finally {
      setBusy(null);
    }
  };
  const exportPDF = async (finalize = false) => {
    if (!note) return;
    setBusy("export");
    setError("");
    let signed = false;
    try {
      if (finalize) {
        const saved = await apiClient.updateNote(note.id, {
          status: "finalized",
        });
        setNote((previous) => (previous ? { ...previous, ...saved } : saved));
        signed = true;
      }
      const pdf = await apiClient.exportNotePDF(note.id);
      downloadBlob(pdf, `scribsy-note-${note.id}.pdf`);
      setConfirmOpen(false);
      show(finalize ? "Note finalized and exported." : "PDF downloaded.");
    } catch (e) {
      setConfirmOpen(false);
      setError(
        `${signed ? "The note was finalized, but the PDF download failed. Use Download PDF to retry. " : ""}${e instanceof Error ? e.message : "Export failed."}`,
      );
    } finally {
      setBusy(null);
    }
  };
  const copyNote = async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note.content);
      show("Note copied.");
    } catch {
      setError(
        "Clipboard access is unavailable. Download a plain-text copy instead.",
      );
    }
  };
  const exportText = async () => {
    if (!note) return;
    setBusy("text");
    try {
      const text = await apiClient.exportNotePlain(note.id);
      downloadBlob(
        new Blob([text], { type: "text/plain;charset=utf-8" }),
        `scribsy-note-${note.id}.txt`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Text export failed.");
    } finally {
      setBusy(null);
    }
  };
  const exportCCD = async () => {
    if (!note) return;
    setBusy("ccd");
    try {
      const text = await apiClient.exportNoteCCD(note.id);
      downloadBlob(
        new Blob([text], { type: "application/xml" }),
        `scribsy-note-${note.id}.xml`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "XML export failed.");
    } finally {
      setBusy(null);
    }
  };
  const loadAudio = async () => {
    if (!note) return;
    setBusy("audio");
    try {
      const audio = await apiClient.exportNoteAudio(note.id);
      setAudioUrl(URL.createObjectURL(audio));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audio is unavailable.");
    } finally {
      setBusy(null);
    }
  };
  const exportAudio = async () => {
    if (!note) return;
    setBusy("audioDownload");
    try {
      const audio = await apiClient.exportNoteAudio(note.id);
      const extension = note.audio_file?.split(".").pop() || "audio";
      downloadBlob(audio, `scribsy-note-${note.id}.${extension}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audio export failed.");
    } finally {
      setBusy(null);
    }
  };
  const playSnippet = async (item: NoteProvenance) => {
    if (!note) return;
    snippetRef.current?.pause();
    if (playingSnippet === item.id) {
      setPlayingSnippet(null);
      return;
    }
    setBusy("snippet");
    try {
      if (!snippetUrlRef.current) {
        const blob = await apiClient.exportNoteAudio(note.id);
        snippetUrlRef.current = URL.createObjectURL(blob);
      }
      const audio = new Audio(snippetUrlRef.current);
      snippetRef.current = audio;
      const start =
        (item.audio_start_ms ?? item.transcript_start_ms ?? 0) / 1000;
      const end = item.audio_end_ms ?? item.transcript_end_ms;
      audio.onloadedmetadata = () => {
        audio.currentTime = start;
      };
      audio.ontimeupdate = () => {
        if (end != null && audio.currentTime >= end / 1000) audio.pause();
      };
      audio.onpause = audio.onended = () => setPlayingSnippet(null);
      audio.onerror = () => {
        setPlayingSnippet(null);
        setError("Could not play the source recording.");
      };
      await audio.play();
      setPlayingSnippet(item.id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not play the source recording.",
      );
    } finally {
      setBusy(null);
    }
  };
  const deleteNote = async () => {
    if (
      !note ||
      !window.confirm("Delete this draft note? This cannot be undone.")
    )
      return;
    setBusy("delete");
    try {
      await apiClient.deleteNote(note.id);
      router.push("/notes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the draft.");
      setBusy(null);
    }
  };
  const updateCode = async (code: NoteCode, accept: boolean) => {
    if (!note) return;
    setBusy(`code-${code.id}`);
    try {
      const saved = await (accept
        ? apiClient.acceptCode(note.id, code.id)
        : apiClient.rejectCode(note.id, code.id));
      setCodes((previous) =>
        previous.map((item) => (item.id === saved.id ? saved : item)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the code.");
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || loading)
    return (
      <div className={styles.workspace} role="status">
        <LoaderCircle size={22} className="animate-spin mb-3" />
        Loading clinical note…
      </div>
    );
  if (!user) return null;
  if (!note)
    return (
      <div className={styles.workspace}>
        <Link href="/notes" className={styles.backLink}>
          <ArrowLeft size={15} />
          Back to notes
        </Link>
        <p role="alert" className={styles.error}>
          {error || "Note not found."}
        </p>
        <button
          className={styles.secondaryButton}
          onClick={() => void refresh()}
        >
          Retry
        </button>
      </div>
    );
  const finalized = isFinalized(note);
  const soap = editing ? editedSoap : noteSoap(note);
  const hasSoap = Object.values(noteSoap(note)).some((value) => value.trim());
  const allComplete = Object.values(noteSoap(note)).every((value) =>
    value.trim(),
  );
  const canFinalize =
    !editing &&
    !finalized &&
    (!hasSoap ||
      (allComplete && SOAP_SECTIONS.every((section) => approved[section.key])));
  const patient = note.patient_first_name
    ? `${note.patient_first_name} ${note.patient_last_name || ""}`
    : `Patient #${note.patient_id}`;
  const rawSource = sourceContent(note);
  const needsSourceReview =
    codes.some(
      (code) =>
        code.status === "suggested" &&
        typeof code.confidence === "number" &&
        code.confidence < 0.6,
    ) ||
    provenance.some(
      (item) => typeof item.confidence === "number" && item.confidence < 0.6,
    );
  return (
    <div className={styles.workspace}>
      <Link href="/notes" className={styles.backLink}>
        <ArrowLeft size={15} />
        Back to notes
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Visit documentation · Note {note.id}</p>
          <h1>{patient}</h1>
          <p>
            {note.note_type} · Visit {note.visit_id} ·{" "}
            {parseDate(note.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className={styles.actions}>
          <Link
            href={`/patients/${note.patient_id}`}
            className={styles.secondaryButton}
          >
            Open patient chart
          </Link>
          {!finalized && !editing && (
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setEditing(true);
                setEditedSoap(noteSoap(note));
                setContent(rawSource);
              }}
              disabled={!!busy}
            >
              Edit
            </button>
          )}
        </div>
      </header>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {finalized && (
        <div className={styles.banner}>
          <span>
            Finalized{" "}
            {note.signed_at
              ? parseDate(note.signed_at).toLocaleString("en-US")
              : ""}
            . This record is locked for editing.
          </span>
          <button
            className={styles.quietButton}
            disabled={!!busy}
            onClick={() => void exportPDF()}
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      )}
      {note.audio_file && (
        <div className={styles.audio}>
          <div className={styles.actions}>
            <label>Visit recording</label>
            {!audioUrl && (
              <button
                className={styles.secondaryButton}
                onClick={() => void loadAudio()}
                disabled={!!busy}
              >
                <Volume2 size={15} />
                {busy === "audio" ? "Loading…" : "Load recording"}
              </button>
            )}
            <button
              className={styles.quietButton}
              disabled={!!busy}
              onClick={() => void exportAudio()}
            >
              Download audio
            </button>
          </div>
          {audioUrl && (
            <audio
              aria-label="Visit recording"
              src={audioUrl}
              controls
              preload="metadata"
            />
          )}
        </div>
      )}
      {!finalized && needsSourceReview && (
        <p className={styles.error} role="status">
          Some suggested codes or source references have low model confidence.
          Review those entries before approving the note.
        </p>
      )}
      <ClinicalNote
        title={`${note.note_type} · ${finalized ? "Approved record" : "Visit draft"}`}
        metadata={parseDate(note.created_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
        transcript={note.transcript || rawSource}
        sourceLabel={note.transcript ? "Transcript" : "Visit notes"}
        soap={soap}
        plainNote={!hasSoap && !editing ? rawSource : undefined}
        finalized={finalized}
        editing={editing}
        onSectionChange={(key, value) =>
          setEditedSoap((previous) => ({ ...previous, [key]: value }))
        }
        draftTools={
          !hasSoap && !editing && !finalized ? (
            <p className={styles.notice}>
              No SOAP draft yet. Generate one from the visit text or use Edit to
              document each section.
            </p>
          ) : null
        }
        sectionControls={(key) =>
          !finalized && !editing && soap[key]?.trim() ? (
            <button
              className={styles.reviewButton}
              aria-label={`Approve ${key}`}
              aria-pressed={!!approved[key]}
              onClick={() =>
                setApproved((previous) => ({
                  ...previous,
                  [key]: !previous[key],
                }))
              }
            >
              <Check size={12} />
              {approved[key] ? "Approved" : "Approve"}
            </button>
          ) : null
        }
        caption={
          finalized
            ? "Reviewed and finalized by the author."
            : "AI-generated text requires clinician review before finalization."
        }
        actions={
          editing ? (
            <>
              <button
                className={styles.secondaryButton}
                disabled={!!busy}
                onClick={() => {
                  setEditedSoap(noteSoap(note));
                  setContent(sourceContent(note));
                  setEditing(false);
                }}
              >
                Cancel edits
              </button>
              <button
                className={styles.primaryButton}
                disabled={!!busy || !content.trim()}
                onClick={() => void save()}
              >
                {busy === "save" ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : finalized ? (
            <button
              className={styles.primaryButton}
              disabled={!!busy}
              onClick={() => void exportPDF()}
            >
              <Download size={15} />
              Download PDF
            </button>
          ) : (
            <>
              <button
                className={styles.secondaryButton}
                disabled={!!busy}
                onClick={() => setEditing(true)}
              >
                Edit draft
              </button>
              <button
                className={styles.primaryButton}
                disabled={!!busy || !canFinalize}
                onClick={() => setConfirmOpen(true)}
              >
                Approve & export
              </button>
              {hasSoap && !canFinalize && (
                <p className={styles.notice}>
                  {allComplete
                    ? "Approve all four sections to finalize."
                    : "Complete all four SOAP sections before finalizing."}
                </p>
              )}
            </>
          )
        }
      />
      {editing && (
        <section className={styles.sourceNotes}>
          <h2>
            <label htmlFor="source-note">Visit notes</label>
          </h2>
          <textarea
            id="source-note"
            className="w-full min-h-40 rounded-md border border-[var(--border)] bg-transparent p-3"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </section>
      )}
      <div className={styles.tools}>
        {!finalized && !editing && (
          <button
            disabled={!!busy}
            className={styles.secondaryButton}
            onClick={() => void generateSoap()}
          >
            <Sparkles size={15} />
            {busy === "generate"
              ? "Generating…"
              : hasSoap
                ? "Regenerate SOAP"
                : "Generate SOAP"}
          </button>
        )}
        <button
          className={styles.secondaryButton}
          onClick={() => void copyNote()}
        >
          <Clipboard size={15} />
          Copy note
        </button>
        <button
          className={styles.secondaryButton}
          disabled={!!busy}
          onClick={() => void exportText()}
        >
          <FileText size={15} />
          Download TXT
        </button>
        <button
          className={styles.secondaryButton}
          disabled={!!busy}
          onClick={() => void exportCCD()}
        >
          Download CCD XML
        </button>
        {!finalized && (
          <button
            disabled={!!busy}
            className="text-red-700 text-xs underline ml-auto"
            onClick={() => void deleteNote()}
          >
            Delete draft
          </button>
        )}
      </div>
      {rawSource && note.transcript && (
        <details className={styles.details}>
          <summary>Visit notes</summary>
          <div>
            <p className="whitespace-pre-wrap text-sm">{rawSource}</p>
          </div>
        </details>
      )}
      <details className={styles.details}>
        <summary>Change history ({history.length})</summary>
        <div>
          {history.length ? (
            history.map((entry) => (
              <div className={styles.historyRow} key={entry.id}>
                <time>
                  {parseDate(entry.created_at).toLocaleString("en-US")}
                </time>
                <strong>
                  {entry.username} · {entry.action.toLowerCase()}
                </strong>
                <p>{entry.summary}</p>
              </div>
            ))
          ) : (
            <p className={styles.notice}>No saved changes yet.</p>
          )}
        </div>
      </details>
      {!!codes.length && (
        <details className={styles.details}>
          <summary>Extracted codes ({codes.length})</summary>
          <div>
            {codes.map((code) => (
              <div key={code.id} className={styles.historyRow}>
                <strong>
                  {code.system}: {code.code} · {code.display}
                </strong>
                <span>
                  {code.status}
                  {typeof code.confidence === "number"
                    ? ` · Model confidence ${Math.round(code.confidence * 100)}%`
                    : ""}
                </span>
                {!finalized && (
                  <div className={styles.actions}>
                    <button
                      className={styles.quietButton}
                      disabled={!!busy}
                      onClick={() => void updateCode(code, true)}
                    >
                      Accept code
                    </button>
                    <button
                      className={styles.quietButton}
                      disabled={!!busy}
                      onClick={() => void updateCode(code, false)}
                    >
                      Reject code
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
      {!!provenance.length && (
        <details className={styles.details}>
          <summary>Source references ({provenance.length})</summary>
          <div>
            {provenance.map((item) => (
              <div className={styles.historyRow} key={item.id}>
                <strong>{item.section || "Note"}</strong>
                <p>{item.text}</p>
                {typeof item.confidence === "number" && (
                  <p className={styles.notice}>
                    Model confidence {Math.round(item.confidence * 100)}%
                  </p>
                )}
                {note.audio_file && (
                  <button
                    className={styles.quietButton}
                    disabled={!!busy}
                    onClick={() => void playSnippet(item)}
                  >
                    <Volume2 size={14} />
                    {playingSnippet === item.id
                      ? "Stop source audio"
                      : "Play source audio"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
      <ApprovalDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void exportPDF(true)}
        busy={busy === "export"}
      />
    </div>
  );
}
