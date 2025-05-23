
// This file is no longer needed as Tasks are part of the Dashboard.
// You can delete this file.
// If you want to redirect /tasks to /dashboard, you can use Next.js redirects in next.config.js
// or create a simple component here that does a client-side redirect.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Using standard Next.js router

export default function TasksRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Redirecting to Dashboard...</p>
    </div>
  );
}
