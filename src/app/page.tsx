
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Corrected import

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard'); // Changed to redirect to dashboard
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading DealFlow...</p>
    </div>
  );
}
