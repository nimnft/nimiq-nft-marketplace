"use client";

import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterPanelProps {
  categories: FilterOption[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function FilterPanel({
  categories,
  selectedCategory,
  onCategoryChange,
}: FilterPanelProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isActive = selectedCategory === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-primary-text"
                : "bg-surface border border-border text-text-secondary hover:text-text hover:border-text-muted"
            )}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
