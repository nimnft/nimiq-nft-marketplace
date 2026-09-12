"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search NFTs, collections, creators...",
}: SearchBarProps) {
  return (
    <div className="relative w-full">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-11 pr-4 py-2.5 rounded-full",
          "bg-surface border border-border text-text text-sm placeholder:text-text-muted",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
          "transition-colors"
        )}
      />
    </div>
  );
}
