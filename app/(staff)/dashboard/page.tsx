"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderCard } from "@/components/staff/OrderCard";
import { StatusBadge } from "@/components/staff/StatusBadge";
import type { OrderStatus } from "@/lib/supabase/types";
import {
  RefreshCwIcon,
  FilterIcon,
  ClockIcon,
  PrinterIcon,
  CheckCircleIcon,
  PackageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  product_type: string;
  quantity: number;
  total: number;
  created_at: string;
  print_sizes?: { name: string } | null;
  paper_options?: { display_name: string } | null;
}

const STATUS_FILTERS: { value: OrderStatus | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Todos", icon: <FilterIcon className="w-4 h-4" /> },
  { value: "pending", label: "Pendientes", icon: <ClockIcon className="w-4 h-4" /> },
  { value: "processing", label: "Procesando", icon: <PrinterIcon className="w-4 h-4" /> },
  { value: "ready", label: "Listos", icon: <CheckCircleIcon className="w-4 h-4" /> },
  { value: "delivered", label: "Entregados", icon: <PackageIcon className="w-4 h-4" /> },
];

export default function StaffDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const statusParam = filter !== "all" ? `?status=${filter}` : "";
      const response = await fetch(`/api/orders${statusParam}`);
      const data = await response.json();

      if (response.ok) {
        // Detectar nuevos pedidos
        if (orders.length > 0) {
          const existingIds = new Set(orders.map((o) => o.id));
          const newIds = data.orders
            .filter((o: Order) => !existingIds.has(o.id) && o.status === "pending")
            .map((o: Order) => o.id);

          if (newIds.length > 0) {
            setNewOrderIds((prev) => new Set([...prev, ...newIds]));
            // Sonido de notificacion
            playNotificationSound();
          }
        }

        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Cargar pedidos inicial
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Auto-refresh cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Sonido de notificacion
  const playNotificationSound = () => {
    try {
      const audio = new Audio("/sounds/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignorar si no puede reproducir
      });
    } catch {
      // Ignorar errores de audio
    }
  };

  const handleOrderClick = (order: Order) => {
    // Quitar de "nuevos"
    setNewOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(order.id);
      return next;
    });

    router.push(`/pedido/${order.id}`);
  };

  // Contadores por estado
  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    processing: orders.filter((o) => o.status === "processing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  const filteredOrders = filter === "all"
    ? orders
    : orders.filter((o) => o.status === filter);

  return (
    <div className="p-6 space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          label="Pendientes"
          value={counts.pending}
          color="bg-primary"
          highlight={counts.pending > 0}
        />
        <StatsCard
          label="Procesando"
          value={counts.processing}
          color="bg-accent"
        />
        <StatsCard
          label="Listos"
          value={counts.ready}
          color="bg-emerald-500"
          highlight={counts.ready > 0}
        />
        <StatsCard
          label="Entregados hoy"
          value={counts.delivered}
          color="bg-gray-400"
        />
      </div>

      {/* Filters and refresh */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {STATUS_FILTERS.map((status) => (
            <Button
              key={status.value}
              variant={filter === status.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status.value)}
              className="whitespace-nowrap"
            >
              {status.icon}
              <span className="ml-1.5">{status.label}</span>
              {status.value !== "all" && status.value !== "delivered" && (
                <span className="ml-1.5 bg-white/20 px-1.5 rounded-full text-xs">
                  {counts[status.value as keyof typeof counts]}
                </span>
              )}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
        >
          <RefreshCwIcon className={cn("w-4 h-4 mr-1.5", refreshing && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No hay pedidos {filter !== "all" ? `con estado "${STATUS_FILTERS.find(s => s.value === filter)?.label}"` : ""}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => handleOrderClick(order)}
              isNew={newOrderIds.has(order.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Stats card component
function StatsCard({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative p-5 rounded-2xl bg-white border border-gray-100 transition-all",
        highlight && "ring-2 ring-offset-2 ring-primary"
      )}
    >
      {highlight && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
      )}
      <div className="flex items-center gap-3">
        <div className={cn("w-3 h-3 rounded-full", color)} />
        <div>
          <p className="text-3xl font-bold text-black">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
