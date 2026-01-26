/**
 * Centralized error configuration for user-friendly messages
 */

export interface ErrorConfig {
  title: string;
  description: string;
  actionLabel?: string;
  duration?: number;
}

export const ERRORS = {
  timeout: {
    title: "Conexion lenta",
    description: "La operacion tardo demasiado. Verifica tu conexion.",
    actionLabel: "Reintentar",
    duration: 10000,
  },
  offline: {
    title: "Sin conexion",
    description: "No hay conexion a internet.",
    actionLabel: "Reintentar",
    duration: 15000,
  },
  missingFiles: {
    title: "Archivos no encontrados",
    description: "Los archivos ya no estan disponibles. Vuelve a subirlos.",
    actionLabel: "Subir de nuevo",
    duration: 10000,
  },
  rateLimited: {
    title: "Demasiados intentos",
    description: "Espera un momento antes de intentar de nuevo.",
    duration: 10000,
  },
  serverError: {
    title: "Error del servidor",
    description: "Hubo un problema. Intenta en unos minutos.",
    actionLabel: "Reintentar",
    duration: 8000,
  },
  validationError: {
    title: "Datos incompletos",
    description: "Faltan datos para completar la operacion.",
    duration: 8000,
  },
} as const;

/**
 * Analyzes an error and returns the appropriate user-friendly configuration
 */
export function getErrorConfig(error: Error | string): ErrorConfig {
  const msg = (typeof error === "string" ? error : error.message).toLowerCase();

  // Timeout/Abort errors
  if (msg.includes("abort") || msg.includes("timeout") || msg.includes("tardo demasiado")) {
    return ERRORS.timeout;
  }

  // Network/Offline errors
  if (msg.includes("network") || msg.includes("offline") || msg.includes("failed to fetch") || msg.includes("conexion")) {
    return ERRORS.offline;
  }

  // File not found errors
  if (msg.includes("410") || msg.includes("no encontr") || msg.includes("not found") || msg.includes("no se subieron")) {
    return ERRORS.missingFiles;
  }

  // Rate limiting errors
  if (msg.includes("429") || msg.includes("demasiadas") || msg.includes("too many") || msg.includes("rate limit")) {
    return ERRORS.rateLimited;
  }

  // Validation errors
  if (msg.includes("validacion") || msg.includes("validation") || msg.includes("faltan") || msg.includes("incomplete")) {
    return ERRORS.validationError;
  }

  // Default to server error
  return ERRORS.serverError;
}
