import { inngest } from "./client";
import { generatePrintReadyPDF } from "@/lib/pdf/generator";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente sin tipos estrictos para operaciones async
async function getSupabaseAdmin() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

/**
 * Funcion que genera el PDF listo para impresion
 * Se ejecuta cuando se crea un nuevo pedido
 */
export const generateOrderPDF = inngest.createFunction(
  {
    id: "generate-order-pdf",
    retries: 3,
  },
  { event: "order/created" },
  async ({ event, step }) => {
    const { orderId } = event.data;

    // Step 1: Obtener datos del pedido
    const order = await step.run("fetch-order", async () => {
      const supabase = await getSupabaseAdmin();
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          print_size:print_sizes(*),
          paper_option:paper_options(*)
        `)
        .eq("id", orderId)
        .single();

      if (error) throw new Error(`Error obteniendo pedido: ${error.message}`);
      return data;
    });

    // Step 2: Actualizar estado a 'processing'
    await step.run("update-status-processing", async () => {
      const supabase = await getSupabaseAdmin();
      await supabase
        .from("orders")
        .update({
          status: "processing" as const,
          processing_started_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", orderId);
    });

    // Step 3: Descargar imagen, generar PDF y subirlo
    // Combinamos estos pasos para evitar serializar buffers entre steps
    const pdfPath = await step.run("generate-and-upload-pdf", async () => {
      const supabase = await getSupabaseAdmin();

      if (!order.processed_image_path) {
        throw new Error("No hay imagen procesada");
      }

      // Descargar imagen
      const { data: imageData, error: downloadError } = await supabase.storage
        .from("processed")
        .download(order.processed_image_path);

      if (downloadError) throw new Error(`Error descargando imagen: ${downloadError.message}`);

      const arrayBuffer = await imageData.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Generar PDF
      const pdfBuffer = await generatePrintReadyPDF(imageBuffer, order);

      // Subir PDF
      const fileName = `${order.code}-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(fileName, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw new Error(`Error subiendo PDF: ${uploadError.message}`);

      return fileName;
    });

    // Step 6: Actualizar pedido con path del PDF y estado 'ready'
    await step.run("update-order-ready", async () => {
      const supabase = await getSupabaseAdmin();
      await supabase
        .from("orders")
        .update({
          pdf_path: pdfPath,
          status: "ready" as const,
          ready_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", orderId);
    });

    return {
      success: true,
      orderId,
      pdfPath,
    };
  }
);

/**
 * Funcion para limpiar archivos antiguos del storage
 * Se ejecuta periodicamente (cron job)
 */
export const cleanupOldFiles = inngest.createFunction(
  {
    id: "cleanup-old-files",
  },
  { cron: "0 3 * * *" }, // Todos los dias a las 3 AM
  async ({ step }) => {
    const olderThanDays = 30;

    // Limpiar imagenes originales
    await step.run("cleanup-originals", async () => {
      const supabase = await getSupabaseAdmin();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Obtener pedidos antiguos entregados
      const { data: orders } = await supabase
        .from("orders")
        .select("original_images")
        .eq("status", "delivered")
        .lt("delivered_at", cutoffDate.toISOString());

      if (!orders) return { deleted: 0 };

      let deletedCount = 0;
      for (const order of orders) {
        if (order.original_images?.length) {
          await supabase.storage.from("originals").remove(order.original_images);
          deletedCount += order.original_images.length;
        }
      }

      return { deleted: deletedCount };
    });

    // Limpiar imagenes procesadas
    await step.run("cleanup-processed", async () => {
      const supabase = await getSupabaseAdmin();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data: orders } = await supabase
        .from("orders")
        .select("processed_image_path")
        .eq("status", "delivered")
        .lt("delivered_at", cutoffDate.toISOString())
        .not("processed_image_path", "is", null);

      if (!orders) return { deleted: 0 };

      const paths = orders
        .map((o) => o.processed_image_path)
        .filter(Boolean) as string[];

      if (paths.length) {
        await supabase.storage.from("processed").remove(paths);
      }

      return { deleted: paths.length };
    });

    return { success: true };
  }
);

// Exportar todas las funciones para el serve
export const functions = [generateOrderPDF, cleanupOldFiles];
