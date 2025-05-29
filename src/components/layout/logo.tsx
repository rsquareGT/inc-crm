import { Briefcase } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/deals"
      className="flex items-center gap-2 text-xl font-bold text-primary hover:text-primary/90 transition-colors"
    >
      <Briefcase className="h-6 w-6" />
      <span>DealFlow</span>
    </Link>
  );
}
