"use client";

import { useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  type: "success" | "error" | "info";
}

interface ToastOptions {
  title: string;
  description?: string;
  type?: "success" | "error" | "info";
}

let toastId = 0;

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colorMap = {
  success: "text-success",
  error: "text-danger",
  info: "text-accent",
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = ++toastId;
    setToasts((prev) => [
      ...prev,
      {
        id,
        title: options.title,
        description: options.description,
        type: options.type ?? "info",
      },
    ]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toast, toasts, dismiss };
}

export function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: ToastItem[];
  dismiss: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = iconMap[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto w-80 bg-surface border border-border rounded-xl shadow-lg p-4 animate-slide-up",
              "flex items-start gap-3"
            )}
          >
            <Icon size={18} className={cn("mt-0.5 shrink-0", colorMap[t.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text">{t.title}</p>
              {t.description && (
                <p className="text-xs text-text-secondary mt-0.5">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-1 rounded text-text-muted hover:text-text transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
