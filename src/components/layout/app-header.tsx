
import { Logo } from './logo';
import { MainNav } from './main-nav';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react'; // Changed from UserCircle
import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';

export function AppHeader() {
  // Dummy auth state for now
  const isAuthenticated = false; // Replace with real auth check later

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-7xl">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          {isAuthenticated && <MainNav /> /* Show nav only if authenticated for now */}
          <ThemeToggle />
          {isAuthenticated ? (
            <Button variant="ghost" size="icon" aria-label="User Profile">
              {/* Replace with User Profile Dropdown later */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
