'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { PasswordRecoveryLayout } from '@/components/password-recovery-layout';
import authStyles from '@/app/login/login.module.css';
import styles from '../recovery.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  return (
    <PasswordRecoveryLayout
      title={success ? 'Check your inbox' : 'Forgot your password?'}
      description={success
        ? 'If an active account matches that email, a password reset link has been sent.'
        : 'Enter your account email and we’ll send you a link to choose a new password.'}
    >
      {success ? (
        <div className={styles.actions} role="status">
          <p className={styles.helper}>Check your spam folder too. Allow a minute for delivery, and use the most recent link. Each link expires after one hour.</p>
          <button type="button" className={authStyles.demoButton} onClick={() => setSuccess(false)}>Request another link</button>
        </div>
      ) : (
        <form className={authStyles.form} aria-busy={loading} onSubmit={async (event) => {
          event.preventDefault();
          if (loading) return;
          setLoading(true);
          setError('');
          try {
            const result = await apiClient.requestPasswordReset(email.trim());
            if (!result.success) throw new Error('Unable to request a reset link. Please try again.');
            setSuccess(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to request a reset link. Please try again.');
          } finally {
            setLoading(false);
          }
        }}>
          {error && <p role="alert" className={authStyles.error}>{error}</p>}
          <div className={authStyles.field}>
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              value={email} onChange={event => setEmail(event.target.value)} required maxLength={254}
              disabled={loading} className={authStyles.input} />
          </div>
          <button type="submit" className={authStyles.signInButton} disabled={loading}>
            {loading ? 'Sending reset link…' : 'Send reset link'}
          </button>
        </form>
      )}
      <Link href="/login" className={styles.backLink}>← Back to sign in</Link>
    </PasswordRecoveryLayout>
  );
}
