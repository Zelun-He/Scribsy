'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    // Force light theme on the login page
    setTheme('light');
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router, setTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Medical-themed background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-teal-800 to-green-900">
        {/* Medical icons pattern */}
        <div className="absolute inset-0 opacity-20">
          {/* Stethoscope - Top Left */}
          <div className="absolute top-20 left-20 w-16 h-16">
            <svg viewBox="0 0 100 100" className="w-full h-full text-teal-300">
              <path d="M20 30 Q30 20 40 30 L45 35 Q35 45 25 35 L20 30 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="45" cy="35" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M53 35 L80 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="80" cy="35" r="12" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          
          {/* Medical Shield - Top Right */}
          <div className="absolute top-16 right-24 w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full text-teal-300">
              <path d="M50 10 L75 25 L75 55 Q75 70 50 85 Q25 70 25 55 L25 25 Z" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M40 45 L45 50 L60 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {/* ECG Waveform - Mid Center */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-16">
            <svg viewBox="0 0 200 50" className="w-full h-full text-teal-300">
              <path d="M10 25 L30 25 L35 10 L40 40 L45 25 L65 25 L70 15 L75 35 L80 25 L100 25 L105 20 L110 30 L115 25 L135 25 L140 15 L145 35 L150 25 L170 25 L175 20 L180 30 L185 25 L190 25" 
                    fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          
          {/* Medicine Bottle - Mid Right */}
          <div className="absolute top-1/3 right-32 w-16 h-24">
            <svg viewBox="0 0 100 150" className="w-full h-full text-teal-300">
              <rect x="35" y="20" width="30" height="100" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/>
              <rect x="40" y="25" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1"/>
              <path d="M30 20 L70 20" stroke="currentColor" strokeWidth="2"/>
              <path d="M35 15 L65 15" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          
          {/* Medical Record Book - Bottom Left */}
          <div className="absolute bottom-24 left-20 w-20 h-16">
            <svg viewBox="0 0 120 80" className="w-full h-full text-teal-300">
              <rect x="10" y="10" width="80" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/>
              <line x1="30" y1="20" x2="80" y2="20" stroke="currentColor" strokeWidth="1"/>
              <line x1="30" y1="25" x2="80" y2="25" stroke="currentColor" strokeWidth="1"/>
              <line x1="30" y1="30" x2="80" y2="30" stroke="currentColor" strokeWidth="1"/>
              <circle cx="20" cy="25" r="3" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </div>
          
          {/* Bandage - Mid Left */}
          <div className="absolute top-2/3 left-16 w-24 h-12">
            <svg viewBox="0 0 120 60" className="w-full h-full text-teal-300">
              <rect x="10" y="20" width="100" height="20" rx="10" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="30" cy="30" r="2" fill="currentColor"/>
              <circle cx="40" cy="30" r="2" fill="currentColor"/>
              <circle cx="50" cy="30" r="2" fill="currentColor"/>
              <circle cx="60" cy="30" r="2" fill="currentColor"/>
              <circle cx="70" cy="30" r="2" fill="currentColor"/>
              <circle cx="80" cy="30" r="2" fill="currentColor"/>
              <circle cx="90" cy="30" r="2" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Pill Capsule - Bottom Right */}
          <div className="absolute bottom-20 right-20 w-20 h-12">
            <svg viewBox="0 0 120 80" className="w-full h-full text-teal-300">
              <ellipse cx="40" cy="40" rx="35" ry="15" fill="none" stroke="currentColor" strokeWidth="2"/>
              <line x1="40" y1="25" x2="40" y2="55" stroke="currentColor" strokeWidth="2"/>
              <circle cx="70" cy="40" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
              <line x1="66" y1="36" x2="74" y2="44" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          
          {/* Scattered Medical Crosses */}
          <div className="absolute top-32 left-1/3 w-8 h-8">
            <svg viewBox="0 0 40 40" className="w-full h-full text-teal-300">
              <line x1="20" y1="5" x2="20" y2="35" stroke="currentColor" strokeWidth="3"/>
              <line x1="5" y1="20" x2="35" y2="20" stroke="currentColor" strokeWidth="3"/>
            </svg>
          </div>
          
          <div className="absolute top-1/4 right-1/3 w-6 h-6">
            <svg viewBox="0 0 30 30" className="w-full h-full text-teal-300">
              <line x1="15" y1="3" x2="15" y2="27" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="15" x2="27" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          
          <div className="absolute bottom-1/3 left-1/4 w-10 h-10">
            <svg viewBox="0 0 40 40" className="w-full h-full text-teal-300">
              <line x1="20" y1="5" x2="20" y2="35" stroke="currentColor" strokeWidth="2"/>
              <line x1="5" y1="20" x2="35" y2="20" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
        </div>
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-transparent via-white to-transparent"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Logo size="lg" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            Sign in to Scribsy
          </h2>
          <p className="mt-2 text-sm text-teal-100">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-emerald-300 hover:text-emerald-200 transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Input
                label="Username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter your username"
              />

              <Input
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link 
                href="/auth/forgot-password" 
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-teal-100">
          <Link href="/" className="inline-block mt-6 font-medium text-emerald-300 hover:text-emerald-200 transition-colors">Back to home</Link>
        </p>
      </div>
    </div>
  );
}