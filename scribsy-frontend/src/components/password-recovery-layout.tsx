import type { ReactNode } from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import authStyles from '@/app/login/login.module.css';
import styles from '@/app/auth/recovery.module.css';

export function PasswordRecoveryLayout({ title, description, children }: {
  title: string; description: string; children: ReactNode;
}) {
  return (
    <main className={authStyles.page}>
      <section className={`${authStyles.signInPanel} ${styles.panel}`} aria-labelledby="recovery-heading">
        <header className={authStyles.brandRow}>
          <Link href="/" className={authStyles.brand} aria-label="Scribsy home">
            <Activity size={22} aria-hidden="true" />Scribsy
          </Link>
        </header>
        <div className={authStyles.formArea}>
          <div className={authStyles.formContent}>
            <h1 id="recovery-heading">{title}</h1>
            <p className={authStyles.subtitle}>{description}</p>
            {children}
          </div>
        </div>
      </section>
      <aside className={authStyles.previewPanel} aria-labelledby="recovery-steps-heading">
        <div className={authStyles.previewContent}>
          <h2 id="recovery-steps-heading" className={authStyles.eyebrow}>Back to your workspace</h2>
          <h3 className={styles.asideHeading}>Get back to your notes.</h3>
          <ol className={styles.steps}>
            <li><strong>Check your email</strong><span>Open the most recent reset link. It expires after one hour.</span></li>
            <li><strong>Choose a new password</strong><span>Use at least eight characters, including a number.</span></li>
            <li><strong>Sign in again</strong><span>Use your new password to return to Scribsy.</span></li>
          </ol>
        </div>
      </aside>
    </main>
  );
}
