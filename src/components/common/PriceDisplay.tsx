import { CircleDollarSign } from "lucide-react";
import { cn, formatNimiq } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const sizeStyles: Record<string, { container: string; icon: string; text: string; currency: string }> = {
  sm: { container: "gap-1", icon: "size-3.5", text: "text-xs", currency: "text-[10px]" },
  md: { container: "gap-1.5", icon: "size-4", text: "text-sm", currency: "text-xs" },
  lg: { container: "gap-2", icon: "size-5", text: "text-base", currency: "text-sm" },
};

export function PriceDisplay({
  price,
  currency = "NIM",
  size = "md",
  showIcon = true,
  className,
}: PriceDisplayProps) {
  const s = sizeStyles[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium text-text",
        s.container,
        className
      )}
    >
      {showIcon && (
        <CircleDollarSign className={cn("text-primary", s.icon)} />
      )}
      <span className={s.text}>{formatNimiq(price)}</span>
      <span className={cn("text-text-muted", s.currency)}>{currency}</span>
    </span>
  );
}
