'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { AnimatedActionContent } from './animated-action';
import styles from './new-note-link.module.css';

type NewNoteLinkProps = ComponentProps<typeof Link> & { label?: string };

export function NewNoteLink({ label = 'New note', className = '', ...props }: NewNoteLinkProps) {
  return <span className={`${styles.wrapper} ${className}`}>
    <Link {...props} className={styles.button} aria-label={label}>
      <AnimatedActionContent label={label} />
    </Link>
  </span>;
}
