import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/types";

interface TagBadgeProps {
  tag: Tag;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

// Simple hash function to get a color variant for tags
function getTagVariant(tag: string): TagBadgeProps['variant'] {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const variants: TagBadgeProps['variant'][] = ["default", "secondary", "outline"];
  return variants[Math.abs(hash) % variants.length];
}


export function TagBadge({ tag, className, onClick, variant }: TagBadgeProps) {
  const determinedVariant = variant || getTagVariant(tag);
  return (
    <Badge
      variant={determinedVariant}
      className={cn("cursor-default", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      {tag}
    </Badge>
  );
}
