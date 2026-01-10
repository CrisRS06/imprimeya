"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrderCard } from "@/components/staff/OrderCard";
import { DeleteOrderDialog } from "@/components/staff/DeleteOrderDialog";
import type { OrderStatus } from "@/lib/supabase/types";
import {
  RefreshCwIcon,
  FilterIcon,
  ClockIcon,
  PackageIcon,
  TrendingUpIcon,
  CalendarIcon,
  DollarSignIcon,
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

interface Stats {
  today: {
    created: number;
    delivered: number;
    pending: number;
    revenue: number;
  };
  week: {
    created: number;
    delivered: number;
    revenue: number;
  };
  month: {
    created: number;
    delivered: number;
    revenue: number;
  };
  allTime: {
    total: number;
    delivered: number;
    cancelled: number;
    revenue: number;
  };
}

const STATUS_FILTERS: { value: OrderStatus | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Todos", icon: <FilterIcon className="w-4 h-4" /> },
  { value: "pending", label: "Pendientes", icon: <ClockIcon className="w-4 h-4" /> },
  { value: "delivered", label: "Entregados", icon: <PackageIcon className="w-4 h-4" /> },
];

// Formatear moneda costarricense
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month" | "allTime">("today");

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/stats");
      const data = await response.json();
      if (response.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

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

  // Cargar pedidos y estadísticas inicial
  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  // Auto-refresh cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true);
      fetchStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchOrders, fetchStats]);

  const handleOrderClick = (order: Order) => {
    // Quitar de "nuevos"
    setNewOrderIds((prev) => {
      const next = new Set(prev);
      next.delete(order.id);
      return next;
    });

    // Navegar directo a la vista de impresion
    router.push(`/imprimir/${order.id}`);
  };

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
  };

  const handleOrderDeleted = () => {
    // Optimistic update: remover el pedido de la lista inmediatamente
    if (orderToDelete) {
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
    }
    setOrderToDelete(null);
    // Refrescar para sincronizar con el servidor
    fetchOrders(true);
    fetchStats();
  };

  // Contadores locales para filtros
  const localCounts = {
    pending: orders.filter((o) => o.status === "pending").length,
  };

  const filteredOrders = filter === "all"
    ? orders
    : orders.filter((o) => o.status === filter);

  // Obtener estadísticas del período seleccionado
  const getPeriodStats = () => {
    if (!stats) return { created: 0, delivered: 0, revenue: 0, pending: 0 };

    switch (selectedPeriod) {
      case "today":
        return stats.today;
      case "week":
        return { ...stats.week, pending: 0 };
      case "month":
        return { ...stats.month, pending: 0 };
      case "allTime":
        return {
          created: stats.allTime.total,
          delivered: stats.allTime.delivered,
          revenue: stats.allTime.revenue,
          pending: 0
        };
      default:
        return stats.today;
    }
  };

  const periodStats = getPeriodStats();

  return (
    <div className="p-6 space-y-6">
      {/* Period selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: "today", label: "Hoy" },
          { value: "week", label: "7 dias" },
          { value: "month", label: "30 dias" },
          { value: "allTime", label: "Total" },
        ].map((period) => (
          <Button
            key={period.value}
            variant={selectedPeriod === period.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod(period.value as typeof selectedPeriod)}
            className="whitespace-nowrap"
          >
            <CalendarIcon className="w-4 h-4 mr-1.5" />
            {period.label}
          </Button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Pendientes ahora"
          value={stats?.today.pending ?? localCounts.pending}
          icon={<ClockIcon className="w-5 h-5" />}
          color="bg-amber-500"
          highlight={(stats?.today.pending ?? localCounts.pending) > 0}
        />
        <StatsCard
          label={`Entregados ${selectedPeriod === "today" ? "hoy" : selectedPeriod === "week" ? "esta semana" : selectedPeriod === "month" ? "este mes" : "total"}`}
          value={periodStats.delivered}
          icon={<PackageIcon className="w-5 h-5" />}
          color="bg-emerald-500"
        />
        <StatsCard
          label={`Creados ${selectedPeriod === "today" ? "hoy" : selectedPeriod === "week" ? "esta semana" : selectedPeriod === "month" ? "este mes" : "total"}`}
          value={periodStats.created}
          icon={<TrendingUpIcon className="w-5 h-5" />}
          color="bg-blue-500"
        />
        <StatsCard
          label={`Ingresos ${selectedPeriod === "today" ? "hoy" : selectedPeriod === "week" ? "semana" : selectedPeriod === "month" ? "mes" : "total"}`}
          value={formatCurrency(periodStats.revenue)}
          icon={<DollarSignIcon className="w-5 h-5" />}
          color="bg-purple-500"
          isRevenue
        />
      </div>

      {/* All time summary (when viewing totals) */}
      {selectedPeriod === "allTime" && stats && (
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          <p>
            De {stats.allTime.total} pedidos totales: {stats.allTime.delivered} entregados, {stats.allTime.cancelled} cancelados
          </p>
        </div>
      )}

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
              {status.value === "pending" && (
                <span className="ml-1.5 bg-white/20 px-1.5 rounded-full text-xs">
                  {localCounts.pending}
                </span>
              )}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchOrders(true);
            fetchStats();
          }}
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
              onDelete={() => handleDeleteClick(order)}
              isNew={newOrderIds.has(order.id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {orderToDelete && (
        <DeleteOrderDialog
          order={orderToDelete}
          open={!!orderToDelete}
          onOpenChange={(open) => !open && setOrderToDelete(null)}
          onDeleted={handleOrderDeleted}
        />
      )}
    </div>
  );
}

// Stats card component
function StatsCard({
  label,
  value,
  icon,
  color,
  highlight,
  isRevenue,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  highlight?: boolean;
  isRevenue?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative p-4 rounded-2xl bg-white border border-gray-100 transition-all",
        highlight && "ring-2 ring-offset-2 ring-amber-500"
      )}
    >
      {highlight && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
      )}
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg text-white", color)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "font-bold text-black truncate",
            isRevenue ? "text-xl" : "text-2xl"
          )}>
            {value}
          </p>
          <p className="text-xs text-gray-500 truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}
