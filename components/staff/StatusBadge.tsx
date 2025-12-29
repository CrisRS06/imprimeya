"use client";

import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/supabase/types";

interface StatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  pending: {
    label: "Pendiente",
    bgColor: "bg-primary/20",
    textColor: "text-primary",
  },
  processing: {
    label: "Procesando",
    bgColor: "bg-accent/20",
    textColor: "text-accent",
  },
  ready: {
    label: "Listo",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-700",
  },
  delivered: {
    label: "Entregado",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
  },
  cancelled: {
    label: "Cancelado",
    bgColor: "bg-destructive/20",
    textColor: "text-destructive",
  },
};

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        config.bgColor,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      {config.label}
    </span>
  );
}
