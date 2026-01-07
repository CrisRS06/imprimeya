import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateOrderCode } from "@/lib/utils/code-generator";
import { inngest } from "@/lib/inngest/client";
import type { ProductType, OrderStatus, PaperType } from "@/lib/supabase/types";
import {
  PRINT_COSTS,
  PAPER_SURCHARGES,
} from "@/lib/utils/price-calculator";
import { checkRateLimit, getClientId, RATE_LIMITS } from "@/lib/utils/rate-limiter";
import { log, generateRequestId } from "@/lib/logger";
import { CreateOrderSchema, ListOrdersQuerySchema } from "@/lib/validations/orders";
import {
  getIdempotencyKeyFromHeader,
  getIdempotentResponse,
  setIdempotentResponse,
  generateIdempotencyKey,
} from "@/lib/utils/idempotency";
import { getStaffUser } from "@/lib/auth/staff-check";

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

// Valores válidos para productType
const VALID_PRODUCT_TYPES = ["photo", "document", "single_photo", "collage", "poster"] as const;

// Valores válidos para paper types (solo los que están en el mapa)
const VALID_PAPER_TYPES = Object.keys(PAPER_TYPE_MAP);

// Constantes de validación
const MAX_QUANTITY = 100;
const MIN_QUANTITY = 1;
const MAX_LIMIT = 100;
const MAX_NOTES_LENGTH = 500;

// Función de validación segura de paper type
function getValidPaperType(paperType: string): string | null {
  if (!paperType || typeof paperType !== "string") return null;
  const mapped = PAPER_TYPE_MAP[paperType];
  return mapped || null; // No fallback to user input
}

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
  const requestId = generateRequestId();

  try {
    // Rate limiting
    const clientId = getClientId(request.headers);
    const rateCheck = checkRateLimit(`orders:${clientId}`, RATE_LIMITS.orders);

    if (!rateCheck.success) {
      log.warn("Rate limit exceeded for orders", { clientId, requestId });
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const rawBody = await request.json();

    // Check for idempotency key (header or auto-generated)
    let idempotencyKey = getIdempotencyKeyFromHeader(request.headers);
    if (!idempotencyKey) {
      // Auto-generate based on client + body hash
      idempotencyKey = generateIdempotencyKey(clientId, rawBody);
    }

    // Check if we've already processed this request
    const cachedResponse = getIdempotentResponse(idempotencyKey);
    if (cachedResponse) {
      log.info("Returning cached idempotent response", { idempotencyKey, requestId });
      return NextResponse.json(cachedResponse.response, {
        status: cachedResponse.status,
        headers: { "X-Idempotent-Replayed": "true" },
      });
    }

    // Validación con Zod
    const parseResult = CreateOrderSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
      log.warn("Order validation failed", { errors, requestId });
      return NextResponse.json(
        { error: "Datos inválidos", details: errors },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    const supabase = await createServiceClient();

    // Validate that originalImages paths are valid and not empty strings
    const invalidPaths = body.originalImages.filter(
      (path: string) => !path || typeof path !== "string" || path.trim() === ""
    );
    if (invalidPaths.length > 0) {
      log.warn("Invalid image paths in order", { invalidPaths, requestId });
      return NextResponse.json(
        { error: "Hay imagenes sin subir correctamente. Por favor vuelve a subirlas." },
        { status: 400 }
      );
    }

    log.info("Creating order", { productType: body.productType, quantity: body.quantity, requestId });

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

    // Mapear tipo de papel del frontend al valor de BD (ya validado arriba)
    const dbPaperType = getValidPaperType(body.paperType);
    if (!dbPaperType) {
      return NextResponse.json(
        { error: `Error interno: tipo de papel no mapeado: ${body.paperType}` },
        { status: 500 }
      );
    }

    // Obtener ID de papel (requerido)
    const { data: paperOption } = await sb
      .from("paper_options")
      .select("id, price_multiplier")
      .eq("type", dbPaperType)
      .single() as { data: PaperOptionResult | null };

    if (!paperOption) {
      log.error("Paper option not found", undefined, { paperType: body.paperType, dbPaperType, requestId });
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
      log.error("Failed to create order", error, { requestId });
      return NextResponse.json(
        { error: "Error creando pedido" },
        { status: 500 }
      );
    }

    log.info("Order created successfully", { orderId: order.id, code: order.code, requestId });

    // Disparar evento para generar PDF en background
    try {
      await inngest.send({
        name: "order/created",
        data: {
          orderId: order.id,
        },
      });
      log.debug("Inngest event sent", { orderId: order.id, requestId });
    } catch (inngestError) {
      log.error("Failed to send Inngest event", inngestError, { orderId: order.id, requestId });
      // No fallar el request por esto, el PDF se puede generar manualmente
    }

    const successResponse = {
      success: true,
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        total: order.total,
      },
    };

    // Cache successful response for idempotency
    setIdempotentResponse(idempotencyKey, successResponse, 200);

    return NextResponse.json(successResponse);
  } catch (error) {
    log.error("Unhandled error in POST /api/orders", error, { requestId });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET /api/orders - Listar pedidos (para staff)
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Rate limiting for GET (more lenient)
    const clientId = getClientId(request.headers);
    const rateCheck = checkRateLimit(`orders:get:${clientId}`, RATE_LIMITS.api);

    if (!rateCheck.success) {
      log.warn("Rate limit exceeded for orders list", { clientId, requestId });
      return NextResponse.json(
        { error: "Demasiadas solicitudes" },
        { status: 429 }
      );
    }

    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);

    // Validación con Zod
    const queryParams = {
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    const parseResult = ListOrdersQuerySchema.safeParse(queryParams);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Parámetros inválidos" },
        { status: 400 }
      );
    }

    const { status, limit, offset } = parseResult.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Select solo campos necesarios para listado (evita traer design_data JSONB pesado)
    let query = sb
      .from("orders")
      .select(`
        id,
        code,
        status,
        product_type,
        quantity,
        subtotal,
        total,
        is_color,
        notes,
        created_at,
        updated_at,
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
      log.error("Failed to fetch orders", error, { requestId });
      return NextResponse.json(
        { error: "Error obteniendo pedidos" },
        { status: 500 }
      );
    }

    // Enriquecer ordenes con datos de precio calculados
    const enrichedOrders = orders?.map((order: Record<string, unknown>) => {
      const isColor = order.is_color !== false; // default true
      const printCost = isColor ? PRINT_COSTS.color : PRINT_COSTS.blackWhite;

      // Obtener tipo de papel desde paper_options (design_data no se trae en listado)
      const paperOptions = order.paper_options as { type?: string } | null;
      const dbPaperType = (paperOptions?.type || "bond_normal") as PaperType;
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
    log.error("Unhandled error in GET /api/orders", error, { requestId });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
