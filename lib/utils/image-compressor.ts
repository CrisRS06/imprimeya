/**
 * Compresor de imágenes robusto para ImprimeYA
 *
 * Diseñado para funcionar con límites de Vercel (4.5MB max payload)
 * - Reduce dimensiones PRIMERO para ahorrar memoria
 * - Timeout de 30s para evitar bloqueos
 * - Múltiples intentos con calidad decreciente
 * - Mensajes de error claros
 */

import {
  MAX_UPLOAD_SIZE,
  MAX_IMAGE_DIMENSION,
  COMPRESSION_TIMEOUT_MS,
  COMPRESSION_QUALITIES,
} from "@/lib/constants";

export interface CompressionResult {
  success: boolean;
  file: File;
  originalSize: number;
  compressedSize: number;
  error?: string;
}

/**
 * Comprime una imagen para que quepa en el límite de Vercel
 *
 * @param file - Archivo de imagen a comprimir
 * @returns Resultado de compresión con archivo comprimido o error
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  // Si ya es pequeño, devolver sin cambios
  if (file.size <= MAX_UPLOAD_SIZE) {
    return {
      success: true,
      file,
      originalSize,
      compressedSize: file.size,
    };
  }

  // Solo comprimir imágenes
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return {
      success: false,
      file,
      originalSize,
      compressedSize: file.size,
      error: "Formato de imagen no soportado para compresión",
    };
  }

  // Ejecutar compresión con timeout
  try {
    const result = await Promise.race([
      performCompression(file),
      createTimeout(COMPRESSION_TIMEOUT_MS),
    ]);

    return {
      ...result,
      originalSize,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return {
      success: false,
      file,
      originalSize,
      compressedSize: file.size,
      error: message,
    };
  }
}

/**
 * Crea una promesa que rechaza después del timeout
 */
function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Compresión tardó más de ${ms / 1000} segundos. Intenta con una imagen más pequeña.`));
    }, ms);
  });
}

/**
 * Realiza la compresión real de la imagen
 */
async function performCompression(file: File): Promise<Omit<CompressionResult, "originalSize">> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calcular nuevas dimensiones (reducir PRIMERO para ahorrar memoria)
      const { width, height } = calculateDimensions(img.width, img.height);

      // Crear canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve({
          success: false,
          file,
          compressedSize: file.size,
          error: "Tu navegador no soporta compresión de imágenes",
        });
        return;
      }

      canvas.width = width;
      canvas.height = height;

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Intentar comprimir con diferentes niveles de calidad
      tryCompressionLevels(canvas, file.name, 0, resolve);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        success: false,
        file,
        compressedSize: file.size,
        error: "No se pudo cargar la imagen. El archivo puede estar corrupto.",
      });
    };

    img.src = url;
  });
}

/**
 * Calcula dimensiones manteniendo aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number } {
  // Si ya es pequeña, mantener dimensiones
  if (originalWidth <= MAX_IMAGE_DIMENSION && originalHeight <= MAX_IMAGE_DIMENSION) {
    return { width: originalWidth, height: originalHeight };
  }

  // Calcular ratio para reducir
  const ratio = Math.min(
    MAX_IMAGE_DIMENSION / originalWidth,
    MAX_IMAGE_DIMENSION / originalHeight
  );

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  };
}

/**
 * Intenta comprimir con niveles de calidad decrecientes
 */
function tryCompressionLevels(
  canvas: HTMLCanvasElement,
  fileName: string,
  qualityIndex: number,
  resolve: (result: Omit<CompressionResult, "originalSize">) => void
): void {
  // Si probamos todas las calidades sin éxito
  if (qualityIndex >= COMPRESSION_QUALITIES.length) {
    // Último intento: reducir dimensiones más agresivamente
    const currentWidth = canvas.width;
    const currentHeight = canvas.height;

    // Si ya es muy pequeño, fallar
    if (currentWidth < 800 || currentHeight < 800) {
      resolve({
        success: false,
        file: new File([], fileName),
        compressedSize: 0,
        error: `No se pudo comprimir la imagen a menos de ${MAX_UPLOAD_SIZE / 1024 / 1024}MB. Intenta con una imagen de menor resolución.`,
      });
      return;
    }

    // Reducir dimensiones a la mitad y reintentar
    const newCanvas = document.createElement("canvas");
    const newCtx = newCanvas.getContext("2d");

    if (!newCtx) {
      resolve({
        success: false,
        file: new File([], fileName),
        compressedSize: 0,
        error: "Error al procesar imagen",
      });
      return;
    }

    newCanvas.width = Math.round(currentWidth * 0.7);
    newCanvas.height = Math.round(currentHeight * 0.7);
    newCtx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);

    // Reintentar con el canvas más pequeño
    tryCompressionLevels(newCanvas, fileName, 0, resolve);
    return;
  }

  const quality = COMPRESSION_QUALITIES[qualityIndex];

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        // Intentar siguiente nivel de calidad
        tryCompressionLevels(canvas, fileName, qualityIndex + 1, resolve);
        return;
      }

      // Si es suficientemente pequeño, éxito
      if (blob.size <= MAX_UPLOAD_SIZE) {
        const compressedFile = new File(
          [blob],
          fileName.replace(/\.[^.]+$/, ".jpg"),
          { type: "image/jpeg" }
        );

        resolve({
          success: true,
          file: compressedFile,
          compressedSize: compressedFile.size,
        });
        return;
      }

      // Si no, intentar siguiente nivel de calidad
      tryCompressionLevels(canvas, fileName, qualityIndex + 1, resolve);
    },
    "image/jpeg",
    quality
  );
}

/**
 * Verifica si un archivo necesita compresión
 */
export function needsCompression(file: File): boolean {
  return file.size > MAX_UPLOAD_SIZE;
}

/**
 * Formatea el tamaño de archivo para mostrar al usuario
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
