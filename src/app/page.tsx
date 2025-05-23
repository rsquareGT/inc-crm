
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Standard import

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // For now, always redirect to login.
    // Later, this will check auth state.
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading DealFlow...</p>
    </div>
  );
}
