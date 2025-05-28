"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Briefcase, Users, Building, LayoutDashboardIcon } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/deals", label: "Deals", icon: Briefcase },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/companies", label: "Companies", icon: Building },
];

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex items-center gap-1 sm:gap-1 md:gap-2 lg:gap-3", // Adjusted gap for responsiveness
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary flex items-center rounded-md",
            "px-2 py-1.5 sm:px-2 sm:py-2 md:px-3", // Responsive padding
            "gap-1 sm:gap-1.5 md:gap-2", // Responsive gap between icon and label
            pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
              (item.href === "/dashboard" && pathname === "/")
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline-block whitespace-nowrap">{item.label}</span>{" "}
          {/* Hide label on xs screens, ensure no wrap */}
        </Link>
      ))}
    </nav>
  );
}
