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
  const { user, handleAuthFailure } = useAuth();

  // Clear any stale authentication state when this page loads
  useEffect(() => {
    if (user) {
      handleAuthFailure();
    }
  }, [user, handleAuthFailure]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 px-4 py-2">
      <div className="w-full max-w-sm space-y-3">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-7 h-7 text-red-600" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Access Denied
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Your session has expired or you don't have permission to access this page.
            </p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-base">Session Expired</CardTitle>
            <CardDescription className="text-xs">
              Please sign in again to continue using Scribsy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/login">
              <Button className="w-full h-10 text-sm font-medium">
                <ArrowRightIcon className="w-4 h-4 mr-2" />
                Sign In Again
              </Button>
            </Link>
            
            <div className="text-center space-y-1 pt-1">
              <p className="text-xs text-gray-500">Don&apos;t have an account?</p>
              <Link href="/register">
                <Button variant="ghost" className="w-full h-8 text-xs">
                  Create New Account
                </Button>
              </Link>
            </div>

            <div className="pt-1 -mx-6 border-t border-gray-200">
              <Link href="/">
                <Button variant="ghost" className="w-full h-8 text-xs">
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