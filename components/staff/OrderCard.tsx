"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { formatOrderCode } from "@/lib/utils/code-generator";
import { formatPrice } from "@/lib/utils/price-calculator";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/supabase/types";
import { ClockIcon } from "lucide-react";

interface OrderCardProps {
  order: {
    id: string;
    code: string;
    status: OrderStatus;
    product_type: string;
    quantity: number;
    total: number;
    created_at: string;
    print_sizes?: { name: string } | null;
    paper_options?: { display_name: string } | null;
    // Campos calculados para desglose
    isColor?: boolean;
    printCost?: number;
    paperSurcharge?: number;
  };
  onClick?: () => void;
  isNew?: boolean;
  className?: string;
}

const PRODUCT_NAMES: Record<string, string> = {
  single_photo: "Foto",
  collage: "Collage",
  poster: "Poster",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays}d`;
}

export function OrderCard({ order, onClick, isNew, className }: OrderCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 p-5 cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/5 hover:border-gray-200",
        isNew && "ring-2 ring-primary animate-pulse",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Info principal */}
        <div className="flex-1 min-w-0">
          {/* Codigo y estado */}
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono font-bold text-lg text-black">
              {formatOrderCode(order.code)}
            </span>
            <StatusBadge status={order.status} size="sm" />
          </div>

          {/* Detalles */}
          <div className="text-sm text-gray-500 space-y-0.5">
            <p>
              {PRODUCT_NAMES[order.product_type] || order.product_type}
              {order.print_sizes && ` - ${order.print_sizes.name}`}
            </p>
            <p>
              {order.quantity}x
              {order.paper_options && ` ${order.paper_options.display_name}`}
            </p>
          </div>
        </div>

        {/* Precio y tiempo */}
        <div className="text-right">
          <p className="font-bold text-lg text-black">
            {formatPrice(order.total)}
          </p>
          {/* Mini-desglose */}
          {order.printCost !== undefined && (
            <p className="text-xs text-gray-500 mt-0.5">
              {order.quantity}h × {formatPrice(order.printCost)}
              {order.isColor ? " color" : " B/N"}
              {order.paperSurcharge && order.paperSurcharge > 0 && (
                <> + {formatPrice(order.paperSurcharge)}/h</>
              )}
            </p>
          )}
          <p className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-1">
            <ClockIcon className="w-3 h-3" />
            {formatTimeAgo(order.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
