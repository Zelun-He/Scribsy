'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Optionally log to monitoring
    // console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
            <p className="text-stone-600 mb-6">Please try again.</p>
            <button onClick={() => reset()} className="inline-block px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">Try again</button>
          </div>
        </div>
      </body>
    </html>
  );
}


