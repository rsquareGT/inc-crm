import { Logo } from './logo';
import { MainNav } from './main-nav';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-7xl"> {/* Updated max-width */}
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4"> {/* Added sm:gap-4 for better spacing on small screens */}
          <MainNav />
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label="User Profile">
            <UserCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
