'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard');
    }
  }, [authLoading, router, user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10">
      <div className="mx-auto mb-6 max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to continue to your Scribsy dashboard.</p>
      </div>
      <form
        className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/40 space-y-4"
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
        <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium text-slate-700">Username or email</label>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <Button type="submit" className="w-full" loading={loading} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
      </form>
    </div>
  );
}
