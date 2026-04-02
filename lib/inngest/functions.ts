import { inngest } from "./client";
import { generatePrintReadyPDF } from "@/lib/pdf/generator";
import { createClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";

// Cliente admin para background jobs (sin cookies — Inngest corre fuera del request context)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
      // Revert order to pending so staff can process manually
      if (eventData?.orderId) {
        const supabase = getSupabaseAdmin();
        await supabase
          .from("orders")
          .update({ status: "pending" as const } as Record<string, unknown>)
          .eq("id", eventData.orderId);
        log.warn("Order reverted to pending after PDF failure", { orderId: eventData.orderId });
      }
    },
  },
  { event: "order/created" },
  async ({ event, step }) => {
    const { orderId } = event.data;
    log.info("Starting PDF generation", { orderId });

    // Step 1: Obtener datos del pedido
    const order = await step.run("fetch-order", async () => {
      const supabase = getSupabaseAdmin();
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
      const supabase = getSupabaseAdmin();
      await supabase
        .from("orders")
        .update({
          status: "processing" as const,
          processing_started_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", orderId);
      log.debug("Order status updated to processing", { orderId });
    });

    // Step 3: Descargar imagen original, generar PDF y subirlo
    const pdfPath = await step.run("generate-and-upload-pdf", async () => {
      const supabase = getSupabaseAdmin();

      // Use original_images from the originals bucket
      const imagePaths = order.original_images;
      if (!imagePaths || imagePaths.length === 0) {
        log.warn("No original images for order, skipping PDF", { orderId });
        throw new Error("No hay imágenes originales");
      }

      // Download first image for PDF generation
      const imagePath = imagePaths[0];
      log.debug("Downloading original image", { orderId, path: imagePath });
      const { data: imageData, error: downloadError } = await supabase.storage
        .from("originals")
        .download(imagePath);

      if (downloadError) {
        log.error("Error downloading image", downloadError, { orderId, imagePath });
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
      const supabase = getSupabaseAdmin();
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

    // Limpiar imagenes originales de pedidos entregados (7+ días)
    const originalsResult = await step.run("cleanup-originals", async () => {
      const supabase = getSupabaseAdmin();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Pedidos entregados hace más de 7 días
      const { data: deliveredOrders } = await supabase
        .from("orders")
        .select("original_images")
        .eq("status", "delivered")
        .lt("delivered_at", cutoffDate.toISOString());

      // Pedidos cancelados hace más de 7 días
      const { data: cancelledOrders } = await supabase
        .from("orders")
        .select("original_images")
        .eq("status", "cancelled")
        .lt("updated_at", cutoffDate.toISOString());

      // Pedidos abandonados: pending/processing hace más de 3 días (never completed)
      const abandonedCutoff = new Date();
      abandonedCutoff.setDate(abandonedCutoff.getDate() - 3);
      const { data: abandonedOrders } = await supabase
        .from("orders")
        .select("original_images")
        .in("status", ["pending", "processing"])
        .lt("created_at", abandonedCutoff.toISOString());

      const allOrders = [...(deliveredOrders || []), ...(cancelledOrders || []), ...(abandonedOrders || [])];

      let deletedCount = 0;
      for (const order of allOrders) {
        if (order.original_images?.length) {
          await supabase.storage.from("originals").remove(order.original_images);
          deletedCount += order.original_images.length;
        }
      }

      log.info("Cleaned up original images", { deleted: deletedCount, delivered: deliveredOrders?.length || 0, cancelled: cancelledOrders?.length || 0, abandoned: abandonedOrders?.length || 0 });
      return { deleted: deletedCount };
    });

    // Limpiar imagenes procesadas
    const processedResult = await step.run("cleanup-processed", async () => {
      const supabase = getSupabaseAdmin();
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
      const supabase = getSupabaseAdmin();
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

    // Limpiar archivos huérfanos en storage (subidos pero sin orden)
    const orphansResult = await step.run("cleanup-orphan-sessions", async () => {
      const supabase = getSupabaseAdmin();

      // List all session folders in originals bucket
      const { data: folders } = await supabase.storage.from("originals").list("", { limit: 100 });
      if (!folders) return { deleted: 0 };

      // Get all session IDs that have orders
      const { data: orders } = await supabase
        .from("orders")
        .select("client_session_id");
      const activeSessionIds = new Set((orders || []).map(o => o.client_session_id).filter(Boolean));

      let deletedCount = 0;
      const cutoffMs = 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();

      for (const folder of folders) {
        if (!folder.name || folder.name === ".emptyFolderPlaceholder") continue;

        // Skip if this session has an order
        if (activeSessionIds.has(folder.name)) continue;

        // Check folder age (created_at from metadata)
        const folderAge = folder.created_at ? now - new Date(folder.created_at).getTime() : Infinity;
        if (folderAge < cutoffMs) continue; // Skip recent uploads (< 24h)

        // Delete all files in orphan session folder
        const { data: files } = await supabase.storage.from("originals").list(folder.name);
        if (files?.length) {
          const paths = files.map(f => `${folder.name}/${f.name}`);
          await supabase.storage.from("originals").remove(paths);
          deletedCount += paths.length;
        }
      }

      log.info("Cleaned up orphan sessions", { deleted: deletedCount });
      return { deleted: deletedCount };
    });

    log.info("Cleanup job completed", {
      originalsDeleted: originalsResult.deleted,
      processedDeleted: processedResult.deleted,
      pdfsDeleted: pdfsResult.deleted,
      orphansDeleted: orphansResult.deleted,
    });

    return { success: true };
  }
);

// Exportar todas las funciones para el serve
export const functions = [generateOrderPDF, cleanupOldFiles];
