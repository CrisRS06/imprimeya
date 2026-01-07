import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getStaffUser, getSessionId } from "@/lib/auth/staff-check";
import { log, generateRequestId } from "@/lib/logger";
import type { OrderStatus } from "@/lib/supabase/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Tipo para el resultado de pedido
interface OrderResult {
  id: string;
  code: string;
  status: OrderStatus;
  client_session_id?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// GET /api/orders/[id] - Obtener pedido por ID o codigo
// Access control:
// - By CODE (6 chars): Public access (clients checking order status)
// - By UUID: Staff only OR matching session ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId();

  try {
    const { id } = await params;
    const supabase = await createServiceClient();

    // Determine if it's a code (6 chars) or UUID
    const isCode = id.length === 6;
    const column = isCode ? "code" : "id";

    // For UUID access, verify authorization
    if (!isCode) {
      const staffUser = await getStaffUser();
      const sessionId = getSessionId(request.headers);

      if (!staffUser && !sessionId) {
        log.warn("Unauthorized order access attempt", { orderId: id, requestId });
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        );
      }

      // If not staff, we'll check session ID ownership after fetching the order
    }

    const { data: order, error } = await (supabase as ReturnType<typeof createServiceClient> extends Promise<infer T> ? T : never)
      .from("orders")
      .select(`
        *,
        print_sizes (name, width_inches, height_inches, base_price),
        paper_options (type, display_name, price_multiplier)
      `)
      .eq(column, isCode ? id.toUpperCase() : id)
      .single() as { data: OrderResult | null; error: Error | null };

    if (error || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // For UUID access by non-staff, verify session ID ownership
    if (!isCode) {
      const staffUser = await getStaffUser();
      if (!staffUser) {
        const sessionId = getSessionId(request.headers);
        if (order.client_session_id !== sessionId) {
          log.warn("IDOR attempt blocked", {
            orderId: id,
            orderSessionId: order.client_session_id,
            requestSessionId: sessionId,
            requestId,
          });
          return NextResponse.json(
            { error: "No autorizado para ver este pedido" },
            { status: 403 }
          );
        }
      }
    }

    // For public code access, return limited data
    if (isCode) {
      return NextResponse.json({
        order: {
          code: order.code,
          status: order.status,
          product_type: order.product_type,
          quantity: order.quantity,
          total: order.total,
          created_at: order.created_at,
          updated_at: order.updated_at,
        },
      });
    }

    // For authenticated access, return full order
    return NextResponse.json({ order });
  } catch (error) {
    log.error("Error in GET /api/orders/[id]", error, { requestId });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Actualizar pedido (solo staff)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId();

  try {
    // Verify staff authentication
    const staffUser = await getStaffUser();
    if (!staffUser) {
      log.warn("Unauthorized PATCH attempt", { requestId });
      return NextResponse.json(
        { error: "No autorizado. Solo personal de staff." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceClient();

    // Campos permitidos para actualizar
    const allowedFields = [
      "status",
      "staff_notes",
      "processed_image_path",
      "pdf_path",
    ];

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: staffUser.id, // Track who made the change
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Timestamp cuando se entrega
    if (body.status === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error } = await (supabase as any)
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single() as { data: OrderResult | null; error: Error | null };

    if (error) {
      log.error("Error updating order", error, { orderId: id, requestId });
      return NextResponse.json(
        { error: "Error actualizando pedido" },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    log.info("Order updated by staff", {
      orderId: id,
      staffId: staffUser.id,
      staffEmail: staffUser.email,
      changes: Object.keys(updateData),
      requestId,
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    log.error("Error in PATCH /api/orders/[id]", error, { requestId });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Cancelar pedido (solo staff)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId();

  try {
    // Verify staff authentication
    const staffUser = await getStaffUser();
    if (!staffUser) {
      log.warn("Unauthorized DELETE attempt", { requestId });
      return NextResponse.json(
        { error: "No autorizado. Solo personal de staff." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supabase = await createServiceClient();

    // Verificar que el pedido existe y obtener paths de archivos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("orders")
      .select("id, status, original_images, processed_image_path, pdf_path")
      .eq("id", id)
      .single() as {
        data: {
          id: string;
          status: OrderStatus;
          original_images: string[] | null;
          processed_image_path: string | null;
          pdf_path: string | null;
        } | null
      };

    if (!existing) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const previousStatus = existing.status;

    // Marcar como cancelado en lugar de eliminar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("orders")
      .update({
        status: "cancelled" as OrderStatus,
        updated_at: new Date().toISOString(),
        updated_by: staffUser.id,
        cancelled_by: staffUser.id,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      log.error("Error cancelling order", error, { orderId: id, requestId });
      return NextResponse.json(
        { error: "Error cancelando pedido" },
        { status: 500 }
      );
    }

    // Eliminar archivos del storage
    let filesDeleted = 0;
    try {
      if (existing.original_images?.length) {
        await supabase.storage.from("originals").remove(existing.original_images);
        filesDeleted += existing.original_images.length;
      }
      if (existing.processed_image_path) {
        await supabase.storage.from("processed").remove([existing.processed_image_path]);
        filesDeleted += 1;
      }
      if (existing.pdf_path) {
        await supabase.storage.from("pdfs").remove([existing.pdf_path]);
        filesDeleted += 1;
      }
    } catch (storageError) {
      // Log pero no fallar - la orden ya fue cancelada
      log.warn("Error deleting storage files", {
        orderId: id,
        error: storageError instanceof Error ? storageError.message : "Unknown error",
        requestId,
      });
    }

    log.info("Order cancelled by staff", {
      orderId: id,
      staffId: staffUser.id,
      staffEmail: staffUser.email,
      previousStatus,
      filesDeleted,
      requestId,
    });

    return NextResponse.json({
      success: true,
      message: "Pedido cancelado",
    });
  } catch (error) {
    log.error("Error in DELETE /api/orders/[id]", error, { requestId });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
