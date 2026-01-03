import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/supabase/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Tipo para el resultado de pedido
interface OrderResult {
  id: string;
  code: string;
  status: OrderStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// GET /api/orders/[id] - Obtener pedido por ID o codigo
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServiceClient();

    // Buscar por ID (UUID) o por codigo (6 caracteres)
    const isCode = id.length === 6;
    const column = isCode ? "code" : "id";

    const { data: order, error } = await (supabase as ReturnType<typeof createServiceClient> extends Promise<infer T> ? T : never)
      .from("orders")
      .select(`
        *,
        print_sizes (name, width_inches, height_inches, base_price),
        paper_options (type, display_name, price_multiplier)
      `)
      .eq(column, id.toUpperCase())
      .single() as { data: OrderResult | null; error: Error | null };

    if (error || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error in GET /api/orders/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Actualizar pedido (principalmente estado)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
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
      console.error("Error updating order:", error);
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

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error in PATCH /api/orders/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Cancelar pedido
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServiceClient();

    // Verificar que el pedido existe y no esta entregado
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("orders")
      .select("id, status")
      .eq("id", id)
      .single() as { data: { id: string; status: OrderStatus } | null };

    if (!existing) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    if (existing.status === "delivered") {
      return NextResponse.json(
        { error: "No se puede cancelar un pedido entregado" },
        { status: 400 }
      );
    }

    // Marcar como cancelado en lugar de eliminar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("orders")
      .update({
        status: "cancelled" as OrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error cancelling order:", error);
      return NextResponse.json(
        { error: "Error cancelando pedido" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pedido cancelado",
    });
  } catch (error) {
    console.error("Error in DELETE /api/orders/[id]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
