"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2Icon, Loader2Icon, AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";
import { formatOrderCode } from "@/lib/utils/code-generator";
import type { OrderStatus } from "@/lib/supabase/types";

interface DeleteOrderDialogProps {
  order: {
    id: string;
    code: string;
    status: OrderStatus;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteOrderDialog({
  order,
  open,
  onOpenChange,
  onDeleted,
}: DeleteOrderDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar");
      }

      toast.success(`Pedido ${formatOrderCode(order.code)} eliminado`);
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar el pedido"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const isDelivered = order.status === "delivered";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isDeleting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2Icon className="w-5 h-5" />
            Eliminar Pedido
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p>
                ¿Estás seguro de eliminar el pedido{" "}
                <span className="font-mono font-bold text-foreground">
                  {formatOrderCode(order.code)}
                </span>
                ?
              </p>
              {isDelivered && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  <AlertTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Este pedido ya fue entregado. La eliminación es permanente.
                  </span>
                </div>
              )}
              <p className="text-sm">
                Esta acción marcará el pedido como cancelado y eliminará todos los
                archivos asociados (imágenes y PDF).
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="w-4 h-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2Icon className="w-4 h-4" />
                Eliminar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
