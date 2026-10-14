'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DemoLoginButton } from '@/components/demo-login-button';
import authStyles from '../login/login.module.css';
import styles from './register.module.css';

const steps = [
  { title: 'Record or upload a visit', description: 'In the browser, or drop in an audio file.' },
  { title: 'Get a SOAP draft', description: 'Transcript on one side, structured note on the other.' },
  { title: 'Review and approve', description: 'Nothing is final until you sign off.' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasLength = formData.password.length >= 8;
  const hasNumber = /[0-9]/.test(formData.password);

  return (
    <main className={authStyles.page}>
      <section className={`${authStyles.signInPanel} ${styles.registerPanel}`} aria-labelledby="register-heading">
        <header className={authStyles.brandRow}>
          <Link href="/" className={authStyles.brand} aria-label="Scribsy home">
            <Activity size={22} aria-hidden="true" />
            Scribsy
          </Link>
        </header>
        <div className={`${authStyles.formArea} ${styles.formArea}`}>
          <div className={authStyles.formContent}>
            <h1 id="register-heading">Create your account</h1>
            <p className={`${authStyles.subtitle} ${styles.subtitle}`}>
              Already have one? <Link href="/login">Sign in</Link>
            </p>
            <form
              className={authStyles.form}
              aria-busy={loading}
              onSubmit={async (e) => {
                e.preventDefault();
                if (loading) return;
                if (!hasLength || !hasNumber) {
                  setError('Use at least 8 characters, including a number.');
                  return;
                }
                setLoading(true);
                setError('');
                try {
                  await register(formData);
                  router.push('/dashboard');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Registration failed');
                } finally {
                  setLoading(false);
                }
              }}
            >
              {error && <p id="register-error" role="alert" className={authStyles.error}>{error}</p>}
              <div className={authStyles.field}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={loading}
                  required
                  className={authStyles.input}
                />
              </div>
              <div className={authStyles.field}>
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  disabled={loading}
                  aria-describedby="username-help"
                  required
                  className={authStyles.input}
                />
                <p id="username-help" className={styles.helper}>You can sign in with this or your email.</p>
              </div>
              <div className={authStyles.field}>
                <label htmlFor="password">Password</label>
                <div className={authStyles.passwordField}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    pattern=".*[0-9].*"
                    title="Use at least 8 characters, including a number."
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    disabled={loading}
                    aria-describedby="password-requirements"
                    required
                    className={authStyles.input}
                  />
                  <button
                    type="button"
                    className={authStyles.passwordToggle}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-controls="password"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <ul id="password-requirements" className={styles.requirements}>
                  <li data-met={hasLength}>8+ characters<span className="sr-only">{hasLength ? ': met' : ': not met'}</span></li>
                  <li data-met={hasNumber}>A number<span className="sr-only">{hasNumber ? ': met' : ': not met'}</span></li>
                </ul>
              </div>
              <button type="submit" className={authStyles.signInButton} disabled={loading || authLoading}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
            <p className={styles.privacyNote}>
              Before your first visit, review our <Link href="/#security">privacy and security information</Link>.
            </p>
            <div className={styles.demoRow}>
              <p>Just looking around?</p>
              <DemoLoginButton className={styles.demoLink} label="Explore the demo →" />
            </div>
          </div>
        </div>
      </section>
      <aside className={authStyles.previewPanel} aria-labelledby="onboarding-heading">
        <div className={authStyles.previewContent}>
          <h2 id="onboarding-heading" className={authStyles.eyebrow}>After you sign up</h2>
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </main>
  );
}
