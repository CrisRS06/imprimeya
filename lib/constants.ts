/**
 * Constantes centralizadas para ImprimeYA
 * Todos los límites deben estar sincronizados con Vercel (4.5MB max payload)
 */

// Límite de Vercel Hobby es 4.5MB, usamos 4MB para margen de seguridad
export const MAX_UPLOAD_SIZE = 4 * 1024 * 1024; // 4MB

// Dimensión máxima para imágenes (reduce memoria en móviles)
export const MAX_IMAGE_DIMENSION = 2048;

// Timeout para operaciones de red
export const UPLOAD_TIMEOUT_MS = 60000; // 60 segundos

// Timeout para compresión de imagen
export const COMPRESSION_TIMEOUT_MS = 30000; // 30 segundos

// Máximo de archivos por sesión
export const MAX_FILES_PER_SESSION = 20;

// Máximo de archivos procesando simultáneamente (evita congelar UI)
export const MAX_CONCURRENT_UPLOADS = 2;

// Calidades de compresión (de mayor a menor)
export const COMPRESSION_QUALITIES = [0.8, 0.6, 0.4, 0.3];

// Tipos MIME permitidos
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type AllowedImageType = typeof ALLOWED_IMAGE_TYPES[number];
