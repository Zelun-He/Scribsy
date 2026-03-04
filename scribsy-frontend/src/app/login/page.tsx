'use client';

import { SignIn } from '@clerk/nextjs';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function ClerkLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <SignIn routing="hash" signUpUrl="/register" forceRedirectUrl="/dashboard" />
    </div>
  );
}

function LegacyLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        className="w-full max-w-sm rounded-lg border bg-white p-6 space-y-4"
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
        <h1 className="text-xl font-semibold">Sign in</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Input label="Username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <Input label="Password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" className="w-full" loading={loading} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return hasClerkKey ? <ClerkLogin /> : <LegacyLogin />;
}
