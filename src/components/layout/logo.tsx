import { Briefcase } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <div className="flex items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 shadow-lg p-4 backdrop-blur-md">
      <Link
        href="/deals"
        className="flex items-center gap-3 text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 drop-shadow-sm hover:text-emerald-800 dark:hover:text-emerald-300 transition-all"
      >
        <Briefcase className="h-8 w-8 text-emerald-600 dark:text-emerald-400 drop-shadow" />
        <span className="tracking-tight">DealFlow</span>
      </Link>
    </div>
  );
}
