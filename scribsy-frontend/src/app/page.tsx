import Link from "next/link";
import { Activity, Check, Menu, ShieldCheck, X } from "lucide-react";
import { ClinicalNote } from "@/components/notes/clinical-note";
import { SAMPLE_SOAP, SAMPLE_TRANSCRIPT } from "@/lib/sample-visit";
import styles from "./landing.module.css";

const steps = [
  {
    number: "01",
    stage: "Capture",
    title: "Record the visit, or upload it after",
    text: "Use your microphone during the encounter, upload a recording, or start with typed notes.",
    detail: "Accepts: MP3, WAV, M4A, WebM",
  },
  {
    number: "02",
    stage: "Draft",
    title: "Get a transcript and a SOAP draft",
    text: "Scribsy transcribes the conversation, then sorts what was said into Subjective, Objective, Assessment and Plan.",
    detail: "Review the transcript beside the draft",
  },
  {
    number: "03",
    stage: "Approve",
    title: "Edit, approve, export",
    text: "Fix anything that’s off, add what the audio missed, then export when it reads the way you’d write it.",
    detail: "Exports: PDF, plain text, CCD XML",
  },
];
const questions = [
  [
    "Do I have to sign off on every note?",
    "Yes. Generated notes stay in review until you approve and finalize them. Finalized notes are locked for editing, and you can export the record.",
  ],
  [
    "Does it work with my EHR?",
    "You can copy the note or download a PDF, plain-text file, or basic CCD XML. Check which format your EHR accepts; Scribsy does not currently sync directly with an EHR.",
  ],
  [
    "Which visit types can I document?",
    "The workspace supports consultation, follow-up, physical examination, urgent care, admission, discharge, progress, and other note types. You can customize the draft format in settings.",
  ],
  [
    "Can I try it without creating an account?",
    "Yes. The sample visit lets you read the transcript, edit the illustrative SOAP draft, and export a sample. Sign in to save your own patients and notes.",
  ],
];
function LandingBrand() {
  return (
    <Link href="/" className={styles.brand} aria-label="Scribsy home">
      <Activity size={22} strokeWidth={2} />
      Scribsy
    </Link>
  );
}

export default function Home() {
  return (
    <div className={styles.site}>
      <header className={styles.header}>
        <div className={styles.navInner}>
          <LandingBrand />
          <nav className={styles.desktopNav} aria-label="Main navigation">
            <a href="#how">How it works</a>
            <a href="#security">Privacy & security</a>
            <a href="#faq">FAQ</a>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className={styles.navActions}>
            <Link href="/login">Sign in</Link>
            <Link href="/sample-visit" className={styles.primaryButton}>
              Try a sample visit
            </Link>
          </div>
          <details className={styles.mobileMenu}>
            <summary aria-label="Open menu">
              <Menu size={23} />
            </summary>
            <nav aria-label="Mobile navigation">
              <a href="#how">How it works</a>
              <a href="#security">Privacy & security</a>
              <a href="#faq">FAQ</a>
              <Link href="/contact">Contact</Link>
              <Link href="/login">Sign in</Link>
              <Link href="/sample-visit">Try a sample visit</Link>
            </nav>
          </details>
        </div>
      </header>
      <main>
        <section id="top" className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>AI scribe for clinicians</p>
            <h1>Talk to your patient. Scribsy drafts the SOAP note.</h1>
            <p className={styles.lead}>
              Record or upload the visit. Get a structured draft — Subjective,
              Objective, Assessment, Plan. Edit it, approve it, export it.
            </p>
            <div className={styles.heroActions}>
              <Link href="/sample-visit" className={styles.primaryButton}>
                Try a sample visit
              </Link>
              <a href="#how" className={styles.secondaryButton}>
                See how it works
              </a>
            </div>
            <p className={styles.assurance}>
              <ShieldCheck size={18} />
              Every generated note stays in review until you finalize it.
            </p>
          </div>
          <div className={styles.heroPreview}>
            <ClinicalNote
              title="Sample visit · Right ankle injury"
              metadata="09:42 · 6 min 18 s"
              transcript={SAMPLE_TRANSCRIPT}
              soap={SAMPLE_SOAP}
              compact
              illustration
              caption="Illustrative sample. Not real patient data."
              actions={
                <>
                  <Link
                    href="/sample-visit?edit=1"
                    className={styles.smallSecondary}
                  >
                    Edit
                  </Link>
                  <Link href="/sample-visit" className={styles.smallPrimary}>
                    Approve & export
                  </Link>
                </>
              }
            />
          </div>
        </section>
        <section id="how" className={styles.process}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionIntro}>
              <h2>Three steps. You sign off on the last one.</h2>
              <p>
                Keep the familiar SOAP format, with a clearer path from the
                visit to your record.
              </p>
            </div>
            <ol className={styles.steps}>
              {steps.map((step) => (
                <li key={step.number}>
                  <span className={styles.stepNumber}>
                    {step.number} · {step.stage}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <span className={styles.stepDetail}>{step.detail}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className={styles.boundaries}>
          <div>
            <h2>A first draft, not a second opinion.</h2>
            <p>
              Scribsy helps organize the documentation. Clinical judgment stays
              with you, and so does the signature.
            </p>
          </div>
          <div className={styles.boundaryColumns}>
            <div>
              <h3>Scribsy does</h3>
              <ul>
                {[
                  "Turn visit audio into a readable transcript",
                  "Organize it into familiar SOAP sections",
                  "Keep drafts editable until you finalize them",
                ].map((text) => (
                  <li key={text}>
                    <Check size={20} />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Scribsy doesn’t</h3>
              <ul>
                {[
                  "Replace your diagnosis or treatment decisions",
                  "Finalize a note without your approval",
                  "Automatically send notes to an EHR",
                ].map((text) => (
                  <li key={text}>
                    <X size={20} />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
        <section id="security" className={styles.security}>
          <div className={styles.sectionInner}>
            <div className={styles.securityIntro}>
              <p className={styles.eyebrow}>Privacy & security</p>
              <h2>Where your patients’ words go.</h2>
              <p>
                Understand the workflow before you bring a recording into it.
              </p>
            </div>
            <div className={styles.securityGrid}>
              <article>
                <h3>Account access</h3>
                <p>
                  Saved patients and notes belong to your signed-in workspace.
                  The public sample contains fictional data only.
                </p>
              </article>
              <article>
                <h3>Audio & transcript</h3>
                <p>
                  Recordings are processed by the transcription service. Saved
                  audio remains attached to the visit for playback and download.
                </p>
              </article>
              <article>
                <h3>AI processing</h3>
                <p>
                  Transcripts or typed notes are sent to the configured AI
                  provider to produce a structured draft.
                </p>
              </article>
              <article>
                <h3>Your approval</h3>
                <p>
                  You review and correct the draft, then finalize it. The signed
                  record is locked against further edits.
                </p>
              </article>
            </div>
          </div>
        </section>
        <section id="faq" className={styles.faq}>
          <h2>Questions clinicians ask first</h2>
          <div>
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta}>
          <div>
            <div>
              <h2>See a full draft from a sample visit.</h2>
              <p>
                No account needed. Explore the transcript, edit the draft, and
                try the export.
              </p>
            </div>
            <div className={styles.heroActions}>
              <Link href="/sample-visit" className={styles.primaryButton}>
                Try a sample visit
              </Link>
              <Link href="/contact" className={styles.secondaryButton}>
                Talk to us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div>
          <LandingBrand />
          <nav aria-label="Footer navigation">
            <Link href="/contact">Contact</Link>
            <a href="#security">Privacy & security</a>
            <Link href="/login">Sign in</Link>
            <Link href="/dashboard">Dashboard preview</Link>
          </nav>
          <span>© {new Date().getFullYear()} Scribsy</span>
        </div>
      </footer>
    </div>
  );
}
