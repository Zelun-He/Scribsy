import type { ReactNode } from "react";
import type { SOAPNote } from "@/types";
import { SOAP_SECTIONS, TranscriptLine } from "@/lib/sample-visit";
import styles from "./clinical-note.module.css";

interface ClinicalNoteProps {
  title: string;
  metadata?: string;
  transcript: string | TranscriptLine[];
  sourceLabel?: string;
  soap: SOAPNote;
  plainNote?: string;
  finalized?: boolean;
  compact?: boolean;
  illustration?: boolean;
  editing?: boolean;
  onSectionChange?: (key: keyof SOAPNote, value: string) => void;
  sectionControls?: (key: keyof SOAPNote) => ReactNode;
  transcriptTools?: ReactNode;
  draftTools?: ReactNode;
  actions?: ReactNode;
  caption?: string;
  children?: ReactNode;
}

export function ClinicalNote({
  title,
  metadata,
  transcript,
  sourceLabel = "Transcript",
  soap,
  plainNote,
  finalized = false,
  compact = false,
  illustration = false,
  editing = false,
  onSectionChange,
  sectionControls,
  transcriptTools,
  draftTools,
  actions,
  caption,
  children,
}: ClinicalNoteProps) {
  return (
    <figure
      className={`${styles.card} ${compact ? styles.compact : ""}`}
      aria-label={
        illustration
          ? "Illustrative sample transcript and SOAP draft"
          : "Clinical note result"
      }
    >
      <header className={styles.header}>
        <div>
          <span
            className={`${styles.dot} ${finalized ? styles.finalDot : ""}`}
          />
          <strong>{title}</strong>
        </div>
        {metadata && <span className={styles.meta}>{metadata}</span>}
      </header>
      <div className={styles.columns}>
        <section className={styles.transcript} aria-label={sourceLabel}>
          <div className={styles.panelHeading}>
            <h2>{sourceLabel}</h2>
            {transcriptTools}
          </div>
          {Array.isArray(transcript) ? (
            transcript.slice(0, compact ? 5 : undefined).map((line, index) => (
              <p key={index} className={styles.transcriptLine}>
                {line.time && <time>{line.time}</time>}
                <span>
                  {line.speaker && <b>{line.speaker} </b>}
                  {line.text}
                </span>
              </p>
            ))
          ) : transcript.trim() ? (
            <div className={styles.rawTranscript}>{transcript}</div>
          ) : (
            <div className={styles.noTranscript}>
              <p>No recording transcript attached.</p>
              <p>You can still review and finalize a manually written note.</p>
            </div>
          )}
        </section>
        <section className={styles.draft} aria-label="SOAP draft">
          <div className={styles.panelHeading}>
            <h2>{finalized ? "Finalized note" : "Draft note"}</h2>
            <span
              className={`${styles.status} ${finalized ? styles.finalStatus : ""}`}
            >
              {finalized ? "Approved & finalized" : "Needs your review"}
            </span>
          </div>
          {draftTools}
          {plainNote !== undefined ? (
            <p className={styles.rawTranscript}>{plainNote}</p>
          ) : (
            <div className={styles.sections}>
              {SOAP_SECTIONS.map((section) => (
                <div className={styles.section} key={section.key}>
                  <span className={styles.letter} aria-hidden="true">
                    {section.letter}
                  </span>
                  <div className={styles.sectionBody}>
                    {!compact && (
                      <div className={styles.sectionHeading}>
                        <h3>{section.title}</h3>
                        {sectionControls?.(section.key)}
                      </div>
                    )}
                    {editing ? (
                      <textarea
                        aria-label={section.title}
                        rows={4}
                        value={soap[section.key]}
                        onChange={(event) =>
                          onSectionChange?.(section.key, event.target.value)
                        }
                      />
                    ) : (
                      <p
                        className={
                          !soap[section.key]?.trim() ? styles.missing : ""
                        }
                      >
                        {soap[section.key]?.trim() ||
                          "Not yet documented. Review the source and complete this section."}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {children}
          {actions && <div className={styles.actions}>{actions}</div>}
        </section>
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}
