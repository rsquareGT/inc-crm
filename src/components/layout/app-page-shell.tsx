
'use client'; // Needs to be client for useAuth and useEffect

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from './app-header';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

interface AppPageShellProps {
  children: React.ReactNode;
}

export function AppPageShell({ children }: AppPageShellProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only run this check if not loading and not authenticated
    // Middleware should handle initial redirect, this is for client-side changes
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show a loading spinner for the shell if auth state is still loading
  // to prevent brief flashes of content or redirects.
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader /> {/* Header might show its own loading state or a generic one */}
        <main className="flex-1 container py-8 max-w-7xl flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }
  
  // If authenticated, show the children.
  // If not authenticated (and not loading), the useEffect above will trigger a redirect.
  // However, to prevent rendering children momentarily before redirect, we can add a check.
  if (!isAuthenticated) {
    // This content will likely not be visible long due to the redirect,
    // but it's a fallback. A full-page loader specific to non-auth might be better if needed.
     return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8 max-w-7xl flex items-center justify-center">
           <p>Redirecting to login...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container py-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
