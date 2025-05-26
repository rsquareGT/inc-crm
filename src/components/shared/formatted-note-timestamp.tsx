
'use client';

import { useState, useEffect } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { useAuth } from '@/contexts/auth-context';

interface FormattedNoteTimestampProps {
  createdAt: string;
}

export function FormattedNoteTimestamp({ createdAt }: FormattedNoteTimestampProps) {
  const { organization, isLoading: authLoading } = useAuth();
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      // Wait for auth context to load, especially the organization timezone
      setFormattedDate("Loading date...");
      return;
    }

    try {
      const date = new Date(createdAt);
      const orgTimezone = organization?.timezone || 'Etc/UTC'; // Default to UTC if no timezone
      
      // Check if the date is valid before formatting
      if (isNaN(date.getTime())) {
          throw new Error("Invalid date provided to FormattedNoteTimestamp");
      }

      setFormattedDate(formatInTimeZone(date, orgTimezone, "MMM d, yyyy 'at' h:mm a (zzz)"));
    } catch (error) {
      console.error("Error formatting date in FormattedNoteTimestamp:", error, "Raw date:", createdAt);
      // Fallback for invalid dates or errors during formatting
      setFormattedDate(new Date(createdAt).toLocaleString()); // Basic fallback
    }
  }, [createdAt, organization, authLoading]);

  if (formattedDate === null || (authLoading && formattedDate === "Loading date...")) {
    return <span className="text-xs text-muted-foreground">Loading date...</span>;
  }

  return <>{formattedDate}</>;
}
