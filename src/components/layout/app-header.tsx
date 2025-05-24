
'use client';

import { Logo } from './logo';
import { MainNav } from './main-nav';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserCircle, Loader2, Building } from 'lucide-react'; // Added Building
import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


export function AppHeader() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Redirect is handled by AuthContext logout or middleware
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-7xl">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          {isAuthenticated && <MainNav />}
          <ThemeToggle />
          {isLoading ? (
             <Button variant="ghost" size="icon" disabled>
                <Loader2 className="h-5 w-5 animate-spin" />
             </Button>
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.profilePictureUrl} alt={user.firstName || user.email} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link> 
                </DropdownMenuItem>*/}
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/organization/profile" className="flex items-center w-full">
                        <Building className="mr-2 h-4 w-4" /> Manage Organization
                      </Link>
                    </DropdownMenuItem>
                    {/* <DropdownMenuItem asChild>
                      <Link href="/admin/users" className="flex items-center w-full">
                        <Users className="mr-2 h-4 w-4" /> User Management
                      </Link>
                    </DropdownMenuItem> */}
                  </>
                )}
                {/* <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
