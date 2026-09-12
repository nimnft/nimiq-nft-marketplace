"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  variant?: "default" | "compact";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  if (variant === "compact") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center text-text-muted mb-4">
          {icon}
        </div>
        <h3 className="text-base font-medium text-text mb-1">{title}</h3>
        <p className="text-sm text-text-muted max-w-xs">{description}</p>
        {action && (
          <Link
            href={action.href}
            onClick={action.onClick}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-text hover:bg-primary-hover transition-colors"
          >
            {action.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-2xl bg-surface-hover border border-border flex items-center justify-center text-text-muted mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-text mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6">{description}</p>
      {action && (
        <Link
          href={action.href}
          onClick={action.onClick}
          className={cn(
            "inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors",
            "bg-primary text-primary-text hover:bg-primary-hover"
          )}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
