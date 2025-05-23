
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Briefcase, Users, Building, LayoutDashboardIcon } from 'lucide-react'; // Changed ListChecks to LayoutDashboardIcon

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon }, // Added Dashboard
  { href: '/deals', label: 'Deals', icon: Briefcase },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/companies', label: 'Companies', icon: Building },
  // { href: '/tasks', label: 'Tasks', icon: ListChecks }, // Removed Tasks
];

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 py-2 px-3 rounded-md',
            pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) || (item.href === '/dashboard' && pathname === '/') // Make dashboard active on root too
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground/80'
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
