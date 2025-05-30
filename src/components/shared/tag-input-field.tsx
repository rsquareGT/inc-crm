"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tag } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface TagInputFieldProps {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  placeholder?: string;
  textToSuggestFrom?: string; // Text used for AI suggestions (e.g., notes, description)
  className?: string;
}

export function TagInputField({
  value = [],
  onChange,
  placeholder = "Add tags...",
  textToSuggestFrom,
  className,
}: TagInputFieldProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<Tag[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() !== "") {
      e.preventDefault();
      addTag(inputValue.trim());
      setInputValue("");
    } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const addTag = (tag: Tag) => {
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
  };

  const removeTag = (tagToRemove: Tag) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2 items-center">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="flex-grow"
        />
      </div>

      {(suggestedTags.length > 0 || isSuggesting) && (
        <div className="p-2 border rounded-md bg-secondary/30">
          <p className="text-xs text-muted-foreground mb-1">
            {isSuggesting ? "AI thinking..." : "Suggested tags (click to add):"}
          </p>
          <div className="flex flex-wrap gap-1">
            {isSuggesting &&
              Array.from({ length: 3 }).map((_, idx) => (
                <Badge key={`loader-${idx}`} variant="outline" className="animate-pulse">
                  Loading...
                </Badge>
              ))}
            {suggestedTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                onClick={() => {
                  addTag(tag);
                  setSuggestedTags(suggestedTags.filter((s) => s !== tag));
                }}
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="group">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1.5 opacity-50 group-hover:opacity-100 focus:opacity-100 outline-none"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
