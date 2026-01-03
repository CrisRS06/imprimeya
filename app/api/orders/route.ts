import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateOrderCode } from "@/lib/utils/code-generator";
import { inngest } from "@/lib/inngest/client";
import type { ProductType, OrderStatus, PaperType } from "@/lib/supabase/types";
import {
  PRINT_COSTS,
  PAPER_SURCHARGES,
} from "@/lib/utils/price-calculator";

// Mapeo de tipos de papel del frontend a valores del enum en BD
// Frontend usa nombres descriptivos, BD usa enum legacy
const PAPER_TYPE_MAP: Record<string, string> = {
  bond_normal: "normal",
  fotografico: "glossy",
  sticker_semigloss: "sticker",
  cartulina_lino: "lino",
  opalina: "opalina",
  // Compatibilidad con valores antiguos
  normal: "normal",
  glossy: "glossy",
  matte: "matte",
  sticker: "sticker",
  lino: "lino",
};

interface CreateOrderBody {
  productType: ProductType;
  sizeName: string;
  paperType: string; // Frontend puede enviar valores nuevos o legacy
  quantity: number;
  originalImages: string[];
  designData?: Record<string, unknown>;
  collageTemplateId?: string;
  posterRows?: number;
  posterCols?: number;
  notes?: string;
  isColor?: boolean; // Para documentos: true = color, false = B&N
}

// Tipos para resultados de Supabase
interface PrintSizeResult {
  id: string;
  base_price: number;
}

interface PaperOptionResult {
  id: string;
  price_multiplier: number;
}

interface OrderResult {
  id: string;
  code: string;
  status: OrderStatus;
  total: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// POST /api/orders - Crear nuevo pedido
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderBody = await request.json();
    const supabase = await createServiceClient();

    // Validar campos requeridos
    if (!body.productType || !body.sizeName || !body.paperType || !body.quantity) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Generar codigo unico
    let code = generateOrderCode();
    let attempts = 0;
    const maxAttempts = 5;

    // Verificar que el codigo no exista
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    while (attempts < maxAttempts) {
      const { data: existing } = await sb
        .from("orders")
        .select("id")
        .eq("code", code)
        .single();

      if (!existing) break;
      code = generateOrderCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Error generando codigo unico" },
        { status: 500 }
      );
    }

    // Mapear tipo de papel del frontend al valor de BD
    const dbPaperType = PAPER_TYPE_MAP[body.paperType] || body.paperType;

    // Obtener ID de papel (requerido)
    const { data: paperOption } = await sb
      .from("paper_options")
      .select("id, price_multiplier")
      .eq("type", dbPaperType)
      .single() as { data: PaperOptionResult | null };

    if (!paperOption) {
      console.error(`Papel no encontrado: ${body.paperType} -> ${dbPaperType}`);
      return NextResponse.json(
        { error: `Tipo de papel invalido: ${body.paperType}` },
        { status: 400 }
      );
    }

    // Obtener ID de tamaño (para referencia en BD, no para precio)
    const { data: printSize } = await sb
      .from("print_sizes")
      .select("id, base_price")
      .eq("name", body.sizeName)
      .single() as { data: PrintSizeResult | null };

    const printSizeId: string | null = printSize?.id || null;

    // =============================================
    // SISTEMA DE PRECIOS UNIFICADO
    // =============================================
    // Impresión color: ₡100/hoja
    // Impresión B&N: ₡50/hoja
    // + Recargo papel: fotográfico +400, opalina/lino +170, sticker +150
    // =============================================

    const frontendPaperType = body.paperType as PaperType;
    const isColor = body.isColor !== false; // Default true para color

    // Misma lógica para fotos y documentos
    const printCost = isColor ? PRINT_COSTS.color : PRINT_COSTS.blackWhite;
    const paperSurcharge = PAPER_SURCHARGES[frontendPaperType] || 0;
    const pricePerUnit = printCost + paperSurcharge;

    // Calcular totales
    const subtotal = pricePerUnit * body.quantity;
    const total = subtotal; // Sin impuestos por ahora

    // Crear pedido
    // Enriquecer design_data con info de tamaño y papel para referencia
    const enrichedDesignData = {
      ...body.designData,
      sizeName: body.sizeName,
      paperType: body.paperType,
      dbPaperType, // Valor mapeado usado en BD
    };

    const orderData = {
      code,
      product_type: body.productType,
      status: "pending" as OrderStatus,
      design_data: enrichedDesignData,
      print_size_id: printSizeId, // Puede ser null para tamaños nuevos
      paper_option_id: paperOption.id,
      collage_template_id: body.collageTemplateId || null,
      quantity: body.quantity,
      poster_rows: body.posterRows || null,
      poster_cols: body.posterCols || null,
      original_images: body.originalImages,
      subtotal,
      total,
      notes: body.notes || null,
      client_session_id: request.headers.get("x-session-id") || null,
    };

    const { data: order, error } = await sb
      .from("orders")
      .insert(orderData)
      .select()
      .single() as { data: OrderResult | null; error: Error | null };

    if (error || !order) {
      console.error("Error creating order:", error);
      return NextResponse.json(
        { error: "Error creando pedido" },
        { status: 500 }
      );
    }

    // Disparar evento para generar PDF en background
    try {
      await inngest.send({
        name: "order/created",
        data: {
          orderId: order.id,
        },
      });
    } catch (inngestError) {
      console.error("Error sending Inngest event:", inngestError);
      // No fallar el request por esto, el PDF se puede generar manualmente
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        total: order.total,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/orders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET /api/orders - Listar pedidos (para staff)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    let query = sb
      .from("orders")
      .select(`
        *,
        print_sizes (name, width_inches, height_inches),
        paper_options (type, display_name)
      `)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return NextResponse.json(
        { error: "Error obteniendo pedidos" },
        { status: 500 }
      );
    }

    // Enriquecer ordenes con datos de precio calculados
    const enrichedOrders = orders?.map((order: Record<string, unknown>) => {
      const isColor = order.is_color !== false; // default true
      const printCost = isColor ? PRINT_COSTS.color : PRINT_COSTS.blackWhite;

      // Obtener tipo de papel desde design_data o paper_options
      const designData = (order.design_data || {}) as Record<string, unknown>;
      const paperOptions = order.paper_options as { type?: string } | null;
      const dbPaperType = (designData.dbPaperType || paperOptions?.type || "bond_normal") as PaperType;
      const paperSurcharge = PAPER_SURCHARGES[dbPaperType] || 0;

      return {
        ...order,
        isColor,
        printCost,
        paperSurcharge,
      };
    }) || [];

    return NextResponse.json({
      orders: enrichedOrders,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error in GET /api/orders:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
