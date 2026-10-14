'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PasswordRecoveryLayout } from '@/components/password-recovery-layout';
import authStyles from '@/app/login/login.module.css';
import styles from '../recovery.module.css';

function ResetPasswordForm() {
  const token = useSearchParams().get('token');
  const { handleAuthFailure } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  return (
    <PasswordRecoveryLayout
      title={success ? 'Password updated' : !token ? 'Request a reset link' : 'Choose a new password'}
      description={success ? 'Sign in with your new password to return to your workspace.'
        : !token ? 'Open the link in your reset email, or request a new one below.'
        : 'Use at least eight characters, including a number.'}
    >
      {success ? (
        <Link href="/login" className={authStyles.signInButton}>Sign in</Link>
      ) : !token ? (
        <Link href="/auth/forgot-password" className={authStyles.signInButton}>Request a reset link</Link>
      ) : (
        <form className={authStyles.form} aria-busy={loading} onSubmit={async event => {
          event.preventDefault();
          if (loading) return;
          setError('');
          if (password !== confirmation) { setError('Passwords do not match.'); return; }
          if (password.length < 8 || !/[0-9]/.test(password)) { setError('Use at least 8 characters, including a number.'); return; }
          if (new TextEncoder().encode(password).length > 72) { setError('Please use a shorter password (maximum 72 bytes).'); return; }
          setLoading(true);
          try {
            const result = await apiClient.verifyPasswordReset(token, password);
            if (!result.success) throw new Error('Unable to update your password. Please try again.');
            handleAuthFailure();
            setPassword('');
            setConfirmation('');
            setSuccess(true);
            window.history.replaceState(null, '', '/auth/reset-password');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to update your password. Please try again.');
          } finally { setLoading(false); }
        }}>
          {error && <p role="alert" className={authStyles.error}>{error}</p>}
          <div className={authStyles.field}>
            <label htmlFor="new-password">New password</label>
            <div className={authStyles.passwordField}>
              <input id="new-password" name="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                value={password} onChange={event => setPassword(event.target.value)} required minLength={8} maxLength={100}
                pattern=".*[0-9].*" title="Use at least 8 characters, including a number." disabled={loading} className={authStyles.input} />
              <button type="button" className={authStyles.passwordToggle} aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-controls="new-password" aria-pressed={showPassword} onClick={() => setShowPassword(prev => !prev)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          <div className={authStyles.field}>
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password"
              value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={loading} className={authStyles.input} />
          </div>
          <button type="submit" className={authStyles.signInButton} disabled={loading}>{loading ? 'Updating password…' : 'Update password'}</button>
          <p className={styles.helper}>Link expired or already used? <Link href="/auth/forgot-password">Request a new link</Link>.</p>
        </form>
      )}
      {!success && <Link href="/login" className={styles.backLink}>← Back to sign in</Link>}
    </PasswordRecoveryLayout>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<PasswordRecoveryLayout title="Loading reset link…" description="Please wait a moment."><p role="status">Loading…</p></PasswordRecoveryLayout>}><ResetPasswordForm /></Suspense>;
}
