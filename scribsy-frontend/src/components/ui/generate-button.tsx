'use client';

import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import styles from './generate-button.module.css';

interface GenerateButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  fullWidth?: boolean;
}

function AnimatedLabel({ text }: { text: string }) {
  let letter = 0;
  return text.split(/(\s+)/).map((word, index) => /^\s+$/.test(word) ? word : (
    <span className={styles.word} key={index}>
      {Array.from(word).map((character, position) => (
        <span className={styles.letter} style={{ '--letter-delay': `${(letter++ % 13) * 0.08}s` } as CSSProperties} key={position}>{character}</span>
      ))}
    </span>
  ));
}

export function GenerateButton({ loading = false, label = 'Generate', loadingLabel = 'Generating', fullWidth = false, disabled, className = '', type = 'button', ...props }: GenerateButtonProps) {
  return (
    <span className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
      <button {...props} type={type} className={styles.button} disabled={disabled || loading} aria-busy={loading} aria-label={loading ? loadingLabel : label} data-loading={loading}>
        <svg className={styles.sparkles} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
        <span className={styles.text} aria-hidden="true">
          <span className={styles.idleText}><AnimatedLabel text={label} /></span>
          <span className={styles.loadingText}><AnimatedLabel text={loadingLabel} /></span>
        </span>
      </button>
      <span className={styles.announcement} role="status">{loading ? loadingLabel : ''}</span>
    </span>
  );
}
