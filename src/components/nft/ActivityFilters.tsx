"use client";

/**
 * ActivityFilters Component
 *
 * Filter tabs for the activity page.
 */

import React from "react";
import {
  ArrowRightLeft,
  Tag,
  Sparkles,
  Send,
  Handshake,
  Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityFilter } from "@/types/activity";

interface ActivityFiltersProps {
  activeFilter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  counts?: Record<ActivityFilter, number>;
}

const filters: { id: ActivityFilter; label: string; icon: typeof ArrowRightLeft }[] = [
  { id: "all", label: "All", icon: ArrowRightLeft },
  { id: "sales", label: "Sales", icon: ArrowRightLeft },
  { id: "listings", label: "Listings", icon: Tag },
  { id: "transfers", label: "Transfers", icon: Send },
  { id: "mints", label: "Mints", icon: Sparkles },
  { id: "offers", label: "Offers", icon: Handshake },
  { id: "auctions", label: "Auctions", icon: Gavel },
];

export function ActivityFilters({
  activeFilter,
  onFilterChange,
  counts,
}: ActivityFiltersProps) {
  return (
    <div className="flex gap-1 p-1 bg-surface rounded-xl overflow-x-auto">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const count = counts?.[filter.id];

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              activeFilter === filter.id
                ? "bg-primary text-primary-text"
                : "text-text-secondary hover:text-text"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{filter.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 text-xs rounded-full",
                  activeFilter === filter.id
                    ? "bg-primary-text/20"
                    : "bg-bg"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ActivityFilters;
