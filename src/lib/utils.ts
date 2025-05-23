import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Moved from mock-data.ts
export const generateId = () => `id-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
