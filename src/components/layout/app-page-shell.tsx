"use client";

import { useEffect } from "react";
import { useRouter } from "nextjs-toploader/app"; // Using standard Next.js router
import { AppHeader } from "./app-header";
import { useAuth } from "@/contexts/auth-context";
import { Loader2 } from "lucide-react";

interface AppPageShellProps {
  children: React.ReactNode;
}

export function AppPageShell({ children }: AppPageShellProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  const router = useRouter();

  useEffect(() => {
    // This client-side check acts as a backup to the middleware.
    // If the auth state is resolved (not loading) and the user is not authenticated,
    // redirect to login. This can happen if a session expires while the user is on a page.
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show nothing while loading to avoid flash
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <div className="w-full max-w-7xl mx-auto flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
          <main className="w-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  // If not loading, and not authenticated, the useEffect above will trigger a redirect.
  // We render a "Redirecting..." message as a fallback.
  // Note: The middleware should ideally handle the redirect before this component even renders
  // for unauthenticated access to protected routes.
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <div className="w-full max-w-7xl mx-auto flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
          <main className="w-full">
            <p>Redirecting to login...</p>
          </main>
        </div>
      </div>
    );
  }

  // If authenticated, render the children.
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <div className="w-full max-w-7xl mx-auto flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
