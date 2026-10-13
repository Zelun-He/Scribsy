"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./note-workspace.module.css";

export function ApprovalDialog({
  open,
  onClose,
  onConfirm,
  busy,
  sample = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
  sample?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (open) {
      setConfirmed(false);
      ref.current?.showModal();
    } else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      className={styles.dialog}
      aria-labelledby="approve-heading"
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (confirmed) onConfirm();
        }}
      >
        <p className={styles.eyebrow}>
          {sample ? "Illustrative sample" : "Review & finalize"}
        </p>
        <h2 id="approve-heading">Approve this note?</h2>
        <p>
          {sample
            ? "This fictional sample will be marked approved and downloaded as a PDF. It will not be saved to a patient record."
            : "Finalizing signs and locks this note. You can view and export the signed record, but you cannot edit it afterward."}
        </p>
        <label className={styles.confirmation}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            required
          />
          {sample
            ? "I have reviewed the sample note."
            : "I have reviewed all sections and corrected the note."}
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={busy}
          >
            Keep reviewing
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!confirmed || busy}
          >
            {busy
              ? "Exporting…"
              : sample
                ? "Approve & download PDF"
                : "Finalize & download PDF"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
