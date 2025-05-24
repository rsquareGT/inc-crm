
'use client';

import { useEffect } from 'react';
import { useRouter } from 'nextjs-toploader/app'; // Using standard Next.js router

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Default redirect to dashboard. Middleware will handle auth.
    // If not authenticated, middleware redirects to /login.
    // If authenticated, this will go to /dashboard.
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading DealFlow...</p>
    </div>
  );
}
