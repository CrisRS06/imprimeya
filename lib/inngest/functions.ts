import { inngest } from "./client";
import { generatePrintReadyPDF } from "@/lib/pdf/generator";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { log } from "@/lib/logger";

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
    // Timeout de 5 minutos para generacion de PDF
    timeouts: {
      start: "30s", // Debe iniciar en 30s
      finish: "5m", // Debe terminar en 5m
    },
    // Limite de concurrencia para no sobrecargar
    concurrency: {
      limit: 5,
      key: "event.data.orderId",
    },
    onFailure: async ({ error, event }) => {
      const eventData = event.data as { orderId?: string };
      log.error("Inngest function failed: generate-order-pdf", error, {
        orderId: eventData?.orderId,
      });
    },
  },
  { event: "order/created" },
  async ({ event, step }) => {
    const { orderId } = event.data;
    log.info("Starting PDF generation", { orderId });

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

      if (error) {
        log.error("Error fetching order for PDF", error, { orderId });
        throw new Error(`Error obteniendo pedido: ${error.message}`);
      }
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
      log.debug("Order status updated to processing", { orderId });
    });

    // Step 3: Descargar imagen, generar PDF y subirlo
    // Combinamos estos pasos para evitar serializar buffers entre steps
    const pdfPath = await step.run("generate-and-upload-pdf", async () => {
      const supabase = await getSupabaseAdmin();

      if (!order.processed_image_path) {
        log.warn("No processed image for order, skipping PDF", { orderId });
        throw new Error("No hay imagen procesada");
      }

      // Descargar imagen
      log.debug("Downloading processed image", { orderId, path: order.processed_image_path });
      const { data: imageData, error: downloadError } = await supabase.storage
        .from("processed")
        .download(order.processed_image_path);

      if (downloadError) {
        log.error("Error downloading image", downloadError, { orderId });
        throw new Error(`Error descargando imagen: ${downloadError.message}`);
      }

      const arrayBuffer = await imageData.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Generar PDF
      log.debug("Generating PDF", { orderId });
      const pdfBuffer = await generatePrintReadyPDF(imageBuffer, order);

      // Subir PDF
      const fileName = `${order.code}-${Date.now()}.pdf`;
      log.debug("Uploading PDF", { orderId, fileName });
      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(fileName, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        log.error("Error uploading PDF", uploadError, { orderId, fileName });
        throw new Error(`Error subiendo PDF: ${uploadError.message}`);
      }

      return fileName;
    });

    // Step 4: Actualizar pedido con path del PDF y estado 'ready'
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
      log.info("Order PDF ready", { orderId, pdfPath });
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
    // Timeout de 10 minutos para limpieza
    timeouts: {
      start: "1m",
      finish: "10m",
    },
    // Solo una ejecucion a la vez
    concurrency: {
      limit: 1,
    },
    onFailure: async ({ error }) => {
      log.error("Inngest function failed: cleanup-old-files", error);
    },
  },
  { cron: "0 3 * * *" }, // Todos los dias a las 3 AM
  async ({ step }) => {
    const olderThanDays = 7;
    log.info("Starting cleanup job", { olderThanDays });

    // Limpiar imagenes originales
    const originalsResult = await step.run("cleanup-originals", async () => {
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

      log.info("Cleaned up original images", { deleted: deletedCount });
      return { deleted: deletedCount };
    });

    // Limpiar imagenes procesadas
    const processedResult = await step.run("cleanup-processed", async () => {
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

      log.info("Cleaned up processed images", { deleted: paths.length });
      return { deleted: paths.length };
    });

    // Limpiar PDFs
    const pdfsResult = await step.run("cleanup-pdfs", async () => {
      const supabase = await getSupabaseAdmin();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data: orders } = await supabase
        .from("orders")
        .select("pdf_path")
        .eq("status", "delivered")
        .lt("delivered_at", cutoffDate.toISOString())
        .not("pdf_path", "is", null);

      if (!orders) return { deleted: 0 };

      const paths = orders
        .map((o) => o.pdf_path)
        .filter(Boolean) as string[];

      if (paths.length) {
        await supabase.storage.from("pdfs").remove(paths);
      }

      log.info("Cleaned up PDFs", { deleted: paths.length });
      return { deleted: paths.length };
    });

    log.info("Cleanup job completed", {
      originalsDeleted: originalsResult.deleted,
      processedDeleted: processedResult.deleted,
      pdfsDeleted: pdfsResult.deleted,
    });

    return { success: true };
  }
);

// Exportar todas las funciones para el serve
export const functions = [generateOrderPDF, cleanupOldFiles];
