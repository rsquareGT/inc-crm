
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a 9-character random alphanumeric string.
 * Example: '4fzyo82u9'
 * Uniqueness in the database should be enforced by PRIMARY KEY or UNIQUE constraints on ID columns.
 */
export const generateId = () => Math.random().toString(36).substr(2, 9);

