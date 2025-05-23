
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface FormattedNoteTimestampProps {
  createdAt: string;
}

export function FormattedNoteTimestamp({ createdAt }: FormattedNoteTimestampProps) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs only on the client after hydration
    try {
      const date = new Date(createdAt);
      setFormattedDate(format(date, "MMM d, yyyy 'at' h:mm a"));
    } catch (error) {
      console.error("Error formatting date:", error);
      // Fallback or error display if needed
      setFormattedDate("Invalid date");
    }
  }, [createdAt]);

  if (formattedDate === null) {
    // You can return a placeholder or null during server render / pre-hydration
    return <span className="text-xs text-muted-foreground">Loading date...</span>;
  }

  return <>{formattedDate}</>;
}
