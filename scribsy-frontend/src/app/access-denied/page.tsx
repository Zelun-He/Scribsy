'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ExclamationTriangleIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';

export default function AccessDeniedPage() {
  const { logout, user, handleAuthFailure } = useAuth();

  // Clear any stale authentication state when this page loads
  useEffect(() => {
    if (user) {
      handleAuthFailure();
    }
  }, [user, handleAuthFailure]);

  const handleSignInAgain = () => {
    // Clear any stale auth state
    logout();
    // Redirect will happen automatically from logout
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            Your session has expired or you don't have permission to access this page.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Session Expired</CardTitle>
            <CardDescription>
              Please sign in again to continue using Scribsy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/login">
              <Button className="w-full">
                <ArrowRightIcon className="w-4 h-4 mr-2" />
                Sign In Again
              </Button>
            </Link>
            
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Don't have an account?</p>
              <Link href="/register">
                <Button variant="ghost" className="w-full">
                  Create New Account
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t">
              <Link href="/">
                <Button variant="ghost" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}