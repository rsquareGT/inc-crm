import type React from "react";

interface PageSectionHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For action buttons like "Add New"
}

export function PageSectionHeader({ title, description, children }: PageSectionHeaderProps) {
  return (
    <div className="mb-6 pb-4 border-b">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
