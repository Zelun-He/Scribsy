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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-10 h-10 text-red-600" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-gray-900">
              Access Denied
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Your session has expired or you don't have permission to access this page.
            </p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Session Expired</CardTitle>
            <CardDescription className="text-base">
              Please sign in again to continue using Scribsy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Link href="/login">
              <Button className="w-full h-12 text-base font-medium">
                <ArrowRightIcon className="w-5 h-5 mr-2" />
                Sign In Again
              </Button>
            </Link>
            
            <div className="text-center space-y-2 pt-4">
              <p className="text-sm text-gray-500">Don't have an account?</p>
              <Link href="/register">
                <Button variant="ghost" className="w-full h-10">
                  Create New Account
                </Button>
              </Link>
            </div>

            <div className="pt-2 -mx-6 border-t border-gray-200">
              <Link href="/">
                <Button variant="ghost" className="w-full h-10">
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