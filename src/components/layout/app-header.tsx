
'use client'; // Make this a client component to handle logout

import { Logo } from './logo';
import { MainNav } from './main-nav';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react'; // Changed from UserCircle
import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Standard import
import { useToast } from '@/hooks/use-toast';

export function AppHeader() {
  const router = useRouter();
  const { toast } = useToast();

  // Dummy auth state for now - this will be replaced by a global auth context later
  const isAuthenticated = false; // Replace with real auth check later

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: 'Logged Out',
          description: 'You have been successfully logged out.',
        });
        router.push('/login');
        // Optionally, trigger a state update or page reload to reflect logged-out state
        // For now, simple push to login page.
      } else {
        throw new Error(result.error || 'Logout failed.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred during logout.';
      toast({
        title: 'Logout Error',
        description: message,
        variant: 'destructive',
      });
    }
  };


  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-7xl">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          {/* {isAuthenticated && <MainNav />} Show nav only if authenticated for now - will be updated later */}
          <MainNav /> {/* Show MainNav always for now for testing, will be protected later */}
          <ThemeToggle />
          {isAuthenticated ? (
            // This section will be for authenticated user profile/dropdown later
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          ) : (
            <>
            <Button asChild variant="outline">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
            {/* Temporarily showing logout button for testing cookie clearing even if not "authenticated" in UI state */}
            {/* Remove this second logout button once global auth state is in place */}
             <Button onClick={handleLogout} variant="ghost" size="sm" title="Test Logout (Dev)"> 
                <LogOut className="h-4 w-4" />
             </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
