import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { PRINT_COSTS, PAPER_SURCHARGES } from "@/lib/utils/price-calculator";
import type { PaperType } from "@/lib/supabase/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/orders/[id]/print - Obtener datos para impresion
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Obtener pedido con relaciones
    const { data: order, error } = await sb
      .from("orders")
      .select(`
        *,
        print_sizes (name, width_inches, height_inches),
        paper_options (type, display_name)
      `)
      .eq("id", id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    // Obtener URLs publicas de las imagenes originales
    // IMPORTANTE: Mantener indices alineados con photosWithQuantities
    const imageUrls: string[] = [];

    if (order.original_images && order.original_images.length > 0) {
      for (let index = 0; index < order.original_images.length; index++) {
        const imagePath = order.original_images[index];

        // Validar que el path no este vacio
        if (!imagePath) {
          console.warn(`[Print API] Empty image path at index ${index} for order ${order.id}`);
          imageUrls.push(""); // Mantener indice para evitar desalineacion
          continue;
        }

        const { data: urlData } = sb.storage
          .from("originals")
          .getPublicUrl(imagePath);

        if (urlData?.publicUrl) {
          imageUrls.push(urlData.publicUrl);
        } else {
          console.error(`[Print API] Failed to get public URL for: ${imagePath}`);
          imageUrls.push(""); // Mantener indice para evitar desalineacion
        }
      }
    }

    // Extraer info del layout desde design_data
    const designData = order.design_data || {};
    const layoutId = designData.layoutId;
    const sizeName = designData.sizeName || order.print_sizes?.name;
    const photosWithQuantities = designData.photosWithQuantities || [];
    const fillMode = designData.fillMode || "fill"; // "fill" = cover, "fit" = contain

    // Calcular desglose de precio
    const isColor = order.is_color !== false; // default true
    const printCost = isColor ? PRINT_COSTS.color : PRINT_COSTS.blackWhite;
    const dbPaperType = (designData.dbPaperType || order.paper_options?.type || "bond_normal") as PaperType;
    const paperSurcharge = PAPER_SURCHARGES[dbPaperType] || 0;
    const pricePerUnit = printCost + paperSurcharge;

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        quantity: order.quantity,
        total: order.total,
        subtotal: order.subtotal,
        pricePerUnit,
        printCost,
        paperSurcharge,
        productType: order.product_type,
        sizeName,
        paperType: designData.paperType || order.paper_options?.type,
        paperDisplayName: order.paper_options?.display_name,
        isColor,
      },
      print: {
        layoutId,
        imageUrls,
        photosWithQuantities,
        totalPhotos: designData.totalPhotos || 1,
        fillMode,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/orders/[id]/print:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
