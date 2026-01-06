"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils/price-calculator";
import { formatOrderCode } from "@/lib/utils/code-generator";
import {
  ArrowLeftIcon,
  ClockIcon,
  PackageIcon,
  XCircleIcon,
  RefreshCwIcon,
  HomeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/supabase/types";

interface OrderData {
  id: string;
  code: string;
  status: OrderStatus;
  product_type: string;
  quantity: number;
  total: number;
  created_at: string;
  ready_at: string | null;
  delivered_at: string | null;
  print_sizes: {
    name: string;
    width_inches: number;
    height_inches: number;
  } | null;
  paper_options: {
    type: string;
    display_name: string;
  } | null;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  pending: {
    label: "Pendiente",
    description: "Tu pedido esta en cola, pronto estara listo",
    icon: ClockIcon,
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  delivered: {
    label: "Entregado",
    description: "Pedido completado",
    icon: PackageIcon,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  cancelled: {
    label: "Cancelado",
    description: "Este pedido fue cancelado",
    icon: XCircleIcon,
    color: "text-destructive",
    bgColor: "bg-destructive/20",
  },
};

const PRODUCT_NAMES: Record<string, string> = {
  single_photo: "Foto simple",
  collage: "Collage",
  poster: "Poster",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EstadoPedidoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch(`/api/orders/${codigo}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Pedido no encontrado");
        setOrder(null);
      } else {
        setOrder(data.order);
        setError(null);
      }
    } catch {
      setError("Error de conexion");
      setOrder(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Auto-refresh cada 30 segundos si el pedido no esta terminado
    const interval = setInterval(() => {
      if (order && !["delivered", "cancelled"].includes(order.status)) {
        fetchOrder(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Buscando pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-full flex flex-col bg-white">
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
              <XCircleIcon className="w-10 h-10 text-destructive" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Pedido no encontrado
              </h1>
              <p className="text-gray-600 mt-2">
                No encontramos un pedido con el codigo{" "}
                <strong>{formatOrderCode(codigo)}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => fetchOrder()}
                variant="outline"
                className="w-full"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Reintentar
              </Button>

              <Button onClick={() => router.push("/")} className="w-full">
                <HomeIcon className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Header */}
      <header className="px-6 pt-6 pb-4 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Inicio</span>
        </button>
        <h1 className="text-lg font-bold text-black">Estado del pedido</h1>
        <button
          onClick={() => fetchOrder(true)}
          disabled={refreshing}
          className="text-gray-400 hover:text-black transition-colors"
        >
          <RefreshCwIcon
            className={cn("w-5 h-5", refreshing && "animate-spin")}
          />
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-8">
        <div className="max-w-md mx-auto space-y-4">
          {/* Codigo */}
          <Card className="bg-gray-900 text-white">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-gray-400 mb-1">Codigo de pedido</p>
              <p className="text-3xl font-mono font-bold tracking-wider">
                {formatOrderCode(order.code)}
              </p>
            </CardContent>
          </Card>

          {/* Estado */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    statusConfig.bgColor
                  )}
                >
                  <StatusIcon className={cn("w-8 h-8", statusConfig.color)} />
                </div>
                <div>
                  <p
                    className={cn(
                      "text-xl font-bold",
                      statusConfig.color
                    )}
                  >
                    {statusConfig.label}
                  </p>
                  <p className="text-gray-600">{statusConfig.description}</p>
                </div>
              </div>

              {/* Timeline simplificado */}
              <div className="mt-6 space-y-3">
                <TimelineItem
                  label="Pedido creado"
                  time={formatDate(order.created_at)}
                  completed
                />
                <TimelineItem
                  label="Entregado"
                  time={
                    order.delivered_at
                      ? formatDate(order.delivered_at)
                      : undefined
                  }
                  completed={order.status === "delivered"}
                  active={order.status === "pending"}
                  isLast
                />
              </div>
            </CardContent>
          </Card>

          {/* Detalles */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Detalles</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo</span>
                  <span className="font-medium">
                    {PRODUCT_NAMES[order.product_type] || order.product_type}
                  </span>
                </div>
                {order.print_sizes && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tamano</span>
                    <span className="font-medium">{order.print_sizes.name}</span>
                  </div>
                )}
                {order.paper_options && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Papel</span>
                    <span className="font-medium">
                      {order.paper_options.display_name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Cantidad</span>
                  <span className="font-medium">{order.quantity}</span>
                </div>
              </div>

              <hr />

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(order.total)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Mensaje si esta pendiente */}
          {order.status === "pending" && (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4 text-center">
                <ClockIcon className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-black">
                  Pedido en proceso
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Te avisaremos cuando este listo. Presenta tu codigo en el mostrador.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Boton volver */}
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="w-full h-12"
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            Crear nuevo pedido
          </Button>
        </div>
      </main>
    </div>
  );
}

// Componente de item del timeline
function TimelineItem({
  label,
  time,
  completed,
  active,
  isLast,
}: {
  label: string;
  time?: string;
  completed?: boolean;
  active?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            completed
              ? "bg-primary"
              : active
              ? "bg-accent animate-pulse"
              : "bg-gray-300"
          )}
        />
        {!isLast && (
          <div
            className={cn(
              "w-0.5 h-8",
              completed ? "bg-primary" : "bg-gray-200"
            )}
          />
        )}
      </div>
      <div className="flex-1 -mt-0.5">
        <p
          className={cn(
            "text-sm font-medium",
            completed || active ? "text-black" : "text-gray-400"
          )}
        >
          {label}
        </p>
        {time && <p className="text-xs text-gray-500">{time}</p>}
      </div>
    </div>
  );
}
