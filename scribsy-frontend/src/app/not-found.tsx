'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-stone-600 mb-6">The page you’re looking for doesn’t exist or was moved.</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Go home</Link>
      </div>
    </div>
  );
}




