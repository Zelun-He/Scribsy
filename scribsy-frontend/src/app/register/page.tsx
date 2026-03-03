'use client';

import { SignUp, useAuth as useClerkSession } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function ClerkRegister() {
  const router = useRouter();
  const { isSignedIn } = useClerkSession();

  useEffect(() => {
    if (isSignedIn) {
      router.push('/dashboard');
    }
  }, [isSignedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <SignUp routing="path" path="/register" signInUrl="/login" forceRedirectUrl="/dashboard" />
    </div>
  );
}

function LegacyRegister() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        className="w-full max-w-sm rounded-lg border bg-white p-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
          }
          setLoading(true);
          setError('');
          try {
            await register({ username: formData.username, email: formData.email, password: formData.password });
            router.push('/dashboard');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
          } finally {
            setLoading(false);
          }
        }}
      >
        <h1 className="text-xl font-semibold">Create account</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Input label="Username" name="username" value={formData.username} onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))} required />
        <Input label="Email" name="email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} required />
        <Input label="Password" name="password" type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} required />
        <Input label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))} required />
        <Button type="submit" className="w-full" loading={loading} disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</Button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return hasClerkKey ? <ClerkRegister /> : <LegacyRegister />;
}
