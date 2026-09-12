"use client";

import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  count?: number;
  cols?: number;
  variant?: "grid" | "list" | "card";
  className?: string;
}

export function LoadingSkeleton({
  count = 8,
  cols = 4,
  variant = "grid",
  className,
}: LoadingSkeletonProps) {
  const gridCols: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border"
          >
            <div className="h-12 w-12 rounded-lg animate-shimmer flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded animate-shimmer" />
              <div className="h-3 w-1/2 rounded animate-shimmer" />
            </div>
            <div className="h-6 w-20 rounded animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("rounded-2xl bg-surface border border-border overflow-hidden", className)}>
        <div className="aspect-square animate-shimmer" />
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full animate-shimmer" />
            <div className="h-3 w-24 rounded animate-shimmer" />
          </div>
          <div className="h-4 w-3/4 rounded animate-shimmer" />
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="h-2 w-8 rounded animate-shimmer" />
              <div className="h-4 w-16 rounded animate-shimmer" />
            </div>
            <div className="h-6 w-16 rounded animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", gridCols[cols] ?? gridCols[4], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-surface border border-border overflow-hidden"
        >
          <div className="aspect-square animate-shimmer" />
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full animate-shimmer" />
              <div className="h-3 w-24 rounded animate-shimmer" />
            </div>
            <div className="h-4 w-3/4 rounded animate-shimmer" />
            <div className="flex justify-between items-center pt-1">
              <div className="space-y-1">
                <div className="h-2 w-8 rounded animate-shimmer" />
                <div className="h-4 w-16 rounded animate-shimmer" />
              </div>
              <div className="h-3 w-16 rounded animate-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InlineSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded", className)} />;
}
