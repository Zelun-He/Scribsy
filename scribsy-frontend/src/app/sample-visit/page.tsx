"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Activity, ArrowLeft, Download, RotateCcw } from "lucide-react";
import { ClinicalNote } from "@/components/notes/clinical-note";
import { ApprovalDialog } from "@/components/notes/approval-dialog";
import { SAMPLE_SOAP, SAMPLE_TRANSCRIPT } from "@/lib/sample-visit";
import { exportSamplePDF } from "@/lib/sample-export";
import styles from "@/components/notes/note-workspace.module.css";

function SampleVisit() {
  const params = useSearchParams();
  const [soap, setSoap] = useState({ ...SAMPLE_SOAP });
  const [editing, setEditing] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setEditing(params.get("edit") === "1");
  }, [params]);
  const reset = () => {
    setSoap({ ...SAMPLE_SOAP });
    setFinalized(false);
    setEditing(false);
    setError("");
  };
  const exportPDF = async (approve = false) => {
    setBusy(true);
    setError("");
    try {
      await exportSamplePDF(soap);
      if (approve) setFinalized(true);
      setConfirmOpen(false);
    } catch {
      setError("Could not create the sample PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.samplePage}>
      <nav className={styles.sampleNav} aria-label="Sample navigation">
        <Link href="/">
          <Activity size={22} />
          Scribsy
        </Link>
        <Link href="/register">Create your workspace</Link>
      </nav>
      <main className={styles.workspace}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={15} />
          Back to Scribsy
        </Link>
        <div className={styles.banner}>
          <span>
            Sample visit · Fictional data. Changes stay in this preview.
          </span>
          <button onClick={reset} className={styles.quietButton}>
            <RotateCcw size={14} />
            Reset sample
          </button>
        </div>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Visit documentation</p>
            <h1>Right ankle injury</h1>
            <p>Illustrative encounter · SOAP note · Clinician review</p>
          </div>
        </header>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <ClinicalNote
          title="Sample visit · Right ankle injury"
          metadata="09:42 · 6 min 18 s"
          transcript={SAMPLE_TRANSCRIPT}
          soap={soap}
          finalized={finalized}
          editing={editing}
          onSectionChange={(key, value) =>
            setSoap((previous) => ({ ...previous, [key]: value }))
          }
          caption="Illustrative sample. Not real patient data."
          actions={
            editing ? (
              <button
                className={styles.primaryButton}
                onClick={() => setEditing(false)}
              >
                Save sample changes
              </button>
            ) : finalized ? (
              <button
                className={styles.primaryButton}
                onClick={() => void exportPDF()}
                disabled={busy}
              >
                <Download size={15} />
                {busy ? "Exporting…" : "Download PDF"}
              </button>
            ) : (
              <>
                <button
                  className={styles.secondaryButton}
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
                <button
                  className={styles.primaryButton}
                  disabled={
                    busy || !Object.values(soap).every((value) => value.trim())
                  }
                  onClick={() => setConfirmOpen(true)}
                >
                  Approve & export
                </button>
              </>
            )
          }
        />
        <p className={styles.notice}>
          This example demonstrates the review workflow. Sign in to record a
          visit and save your own notes.
        </p>
        <ApprovalDialog
          sample
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void exportPDF(true)}
          busy={busy}
        />
      </main>
    </div>
  );
}
export default function SampleVisitPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading sample visit…</p>}>
      <SampleVisit />
    </Suspense>
  );
}
