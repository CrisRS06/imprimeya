"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/staff/StatusBadge";
import { formatOrderCode } from "@/lib/utils/code-generator";
import { formatPrice } from "@/lib/utils/price-calculator";
import type { OrderStatus } from "@/lib/supabase/types";
import {
  ArrowLeftIcon,
  ClockIcon,
  PrinterIcon,
  CheckCircleIcon,
  PackageIcon,
  DownloadIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OrderDetail {
  id: string;
  code: string;
  status: OrderStatus;
  product_type: string;
  quantity: number;
  subtotal: number;
  total: number;
  created_at: string;
  ready_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  staff_notes: string | null;
  pdf_path: string | null;
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

const PRODUCT_NAMES: Record<string, string> = {
  single_photo: "Foto simple",
  collage: "Collage",
  poster: "Poster",
  photo: "Fotos",
  document: "Documento",
};

const STATUS_ACTIONS: { from: OrderStatus; to: OrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
  {
    from: "pending",
    to: "processing",
    label: "Iniciar impresion",
    icon: <PrinterIcon className="w-4 h-4" />,
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    from: "processing",
    to: "ready",
    label: "Marcar como listo",
    icon: <CheckCircleIcon className="w-4 h-4" />,
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    from: "ready",
    to: "delivered",
    label: "Confirmar entrega",
    icon: <PackageIcon className="w-4 h-4" />,
    color: "bg-gray-700 hover:bg-gray-800",
  },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${id}`);
      const data = await response.json();

      if (response.ok) {
        setOrder(data.order);
      } else {
        toast.error(data.error || "Error cargando pedido");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (response.ok) {
        setOrder(data.order);
        toast.success(`Estado actualizado a ${newStatus}`);
      } else {
        toast.error(data.error || "Error actualizando estado");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    if (!confirm("¿Seguro que deseas cancelar este pedido?")) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Pedido cancelado");
        router.push("/dashboard");
      } else {
        toast.error(data.error || "Error cancelando pedido");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600 mb-4">Pedido no encontrado</p>
        <Button onClick={() => router.push("/dashboard")}>
          Volver al dashboard
        </Button>
      </div>
    );
  }

  const nextAction = STATUS_ACTIONS.find((a) => a.from === order.status);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Volver
        </Button>
      </div>

      {/* Order header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Pedido</p>
              <p className="text-3xl font-mono font-bold text-gray-900">
                {formatOrderCode(order.code)}
              </p>
            </div>
            <StatusBadge status={order.status} size="lg" />
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <ClockIcon className="w-4 h-4" />
            <span>Creado {formatDate(order.created_at)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Boton principal de impresion */}
          {order.product_type === "photo" && order.status !== "cancelled" && (
            <Button
              className="w-full bg-sky-500 hover:bg-sky-600 text-white"
              onClick={() => window.open(`/imprimir/${order.id}`, '_blank')}
            >
              <PrinterIcon className="w-4 h-4 mr-2" />
              Abrir vista de impresion
            </Button>
          )}

          {nextAction && (
            <Button
              className={cn("w-full text-white", nextAction.color)}
              onClick={() => updateStatus(nextAction.to)}
              disabled={updating}
            >
              {nextAction.icon}
              <span className="ml-2">{nextAction.label}</span>
            </Button>
          )}

          {order.pdf_path && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // Descargar PDF desde Supabase Storage
                window.open(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${order.pdf_path}`, '_blank');
              }}
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          )}

          {order.status !== "delivered" && order.status !== "cancelled" && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={cancelOrder}
              disabled={updating}
            >
              <XCircleIcon className="w-4 h-4 mr-2" />
              Cancelar pedido
            </Button>
          )}

          {order.status === "delivered" && (
            <p className="text-center text-sm text-gray-500">
              Pedido completado
              {order.delivered_at && ` el ${formatDate(order.delivered_at)}`}
            </p>
          )}

          {order.status === "cancelled" && (
            <p className="text-center text-sm text-red-500">
              Este pedido fue cancelado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalles del pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow
            label="Tipo de producto"
            value={PRODUCT_NAMES[order.product_type] || order.product_type}
          />
          {order.print_sizes && (
            <DetailRow label="Tamano" value={order.print_sizes.name} />
          )}
          {order.paper_options && (
            <DetailRow label="Papel" value={order.paper_options.display_name} />
          )}
          <DetailRow label="Cantidad" value={order.quantity.toString()} />
          <hr />
          <DetailRow label="Subtotal" value={formatPrice(order.subtotal)} />
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(order.total)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(order.notes || order.staff_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Cliente:</p>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </div>
            )}
            {order.staff_notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Staff:</p>
                <p className="text-sm text-gray-700">{order.staff_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <TimelineItem
              label="Pedido creado"
              time={formatDate(order.created_at)}
              completed
            />
            <TimelineItem
              label="Procesando"
              completed={["processing", "ready", "delivered"].includes(order.status)}
              active={order.status === "processing"}
            />
            <TimelineItem
              label="Listo para recoger"
              time={order.ready_at ? formatDate(order.ready_at) : undefined}
              completed={["ready", "delivered"].includes(order.status)}
              active={order.status === "ready"}
            />
            <TimelineItem
              label="Entregado"
              time={order.delivered_at ? formatDate(order.delivered_at) : undefined}
              completed={order.status === "delivered"}
              isLast
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

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
              ? "bg-green-500"
              : active
              ? "bg-sky-500 animate-pulse"
              : "bg-gray-300"
          )}
        />
        {!isLast && (
          <div
            className={cn("w-0.5 h-8", completed ? "bg-green-500" : "bg-gray-200")}
          />
        )}
      </div>
      <div className="flex-1 -mt-0.5">
        <p
          className={cn(
            "text-sm font-medium",
            completed || active ? "text-gray-900" : "text-gray-400"
          )}
        >
          {label}
        </p>
        {time && <p className="text-xs text-gray-500">{time}</p>}
      </div>
    </div>
  );
}
