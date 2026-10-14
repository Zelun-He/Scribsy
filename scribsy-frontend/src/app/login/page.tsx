'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DemoLoginButton } from '@/components/demo-login-button';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && !user.is_demo) {
      router.replace('/dashboard');
    }
  }, [authLoading, router, user]);

  return (
    <main className={styles.page}>
      <section className={styles.signInPanel} aria-labelledby="sign-in-heading">
        <header className={styles.brandRow}>
          <Link href="/" className={styles.brand} aria-label="Scribsy home">
            <Activity size={22} aria-hidden="true" />
            Scribsy
          </Link>
        </header>

        <div className={styles.formArea}>
          <div className={styles.formContent}>
            <h1 id="sign-in-heading">Sign in to Scribsy</h1>
            <p className={styles.subtitle}>Pick up where you left your drafts.</p>
            <form
              className={styles.form}
              aria-busy={loading}
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError('');
                try {
                  await login({ username, password });
                  router.push('/dashboard');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Login failed');
                } finally {
                  setLoading(false);
                }
              }}
            >
              {error && <p id="login-error" role="alert" className={styles.error}>{error}</p>}
              <div className={styles.field}>
                <label htmlFor="username">Username or email</label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  aria-describedby={error ? 'login-error' : undefined}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label htmlFor="password">Password</label>
                  <Link href="/auth/forgot-password">Forgot password?</Link>
                </div>
                <div className={styles.passwordField}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    aria-describedby={error ? 'login-error' : undefined}
                    required
                    className={styles.input}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-controls="password"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button type="submit" className={styles.signInButton} disabled={loading || authLoading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <div className={styles.divider}><span>OR</span></div>
            <DemoLoginButton className={styles.demoButton} label="Explore the demo →" />
            <p className={styles.demoDescription}>
              View-only workspace with fictional patients, notes, and schedule. No sign-in needed.
            </p>
          </div>
        </div>
        <footer className={styles.footer}>
          <p>New to Scribsy? <Link href="/register">Create an account</Link></p>
        </footer>
      </section>
      <aside className={styles.previewPanel} aria-labelledby="preview-heading">
        <div className={styles.previewContent}>
          <h2 id="preview-heading" className={styles.eyebrow}>A look at your review queue</h2>
          <article className={styles.noteCard}>
            <div className={styles.noteHeader}>
              <h3>Right ankle injury</h3>
              <span className={styles.badge}>Draft ready</span>
            </div>
            <dl className={styles.soapExcerpt}>
              <div>
                <dt><abbr title="Subjective">S</abbr></dt>
                <dd>Right ankle inversion injury 2 days ago. Lateral swelling, pain with weight-bearing.</dd>
              </div>
              <div>
                <dt><abbr title="Assessment">A</abbr></dt>
                <dd>Right lateral ankle sprain. Ottawa ankle rules negative.</dd>
              </div>
            </dl>
          </article>
          <div className={styles.followUp}>
            <h3>Follow-up: blood pressure</h3>
            <span>10:15 · 12 min</span>
          </div>
          <p className={styles.previewCaption}>Every note stays a draft until you approve it.</p>
          <p className={styles.sampleDisclaimer}>Illustrative sample · Fictional patient data</p>
        </div>
      </aside>
    </main>
  );
}
