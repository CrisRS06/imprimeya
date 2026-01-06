/**
 * Rate limiter básico para API routes
 *
 * NOTA: Este rate limiter usa memoria local, lo cual tiene limitaciones en Vercel:
 * - Cada instancia serverless tiene su propia memoria
 * - Los deploys reinician la memoria
 * - No es 100% efectivo contra ataques distribuidos
 *
 * Para una solución robusta en producción de alto tráfico, considerar:
 * - Vercel KV (Redis): https://vercel.com/docs/storage/vercel-kv
 * - Upstash Redis: https://upstash.com/
 *
 * El rate limiter actual es suficiente para:
 * - Prevenir abuso accidental
 * - Protección básica contra scripts simples
 * - Aplicaciones de bajo/medio tráfico
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store en memoria (limitación: no persiste entre instancias)
const store = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas periódicamente
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now) {
        store.delete(key);
      }
    }
  }, 60 * 1000); // Cada minuto
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (e.g., IP address, session ID)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // First request or expired window
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs;
    store.set(key, { count: 1, resetTime });
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime,
    };
  }

  // Within window, check count
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Get client identifier from request headers
 * Falls back to a random ID if no identifiable headers
 */
export function getClientId(headers: Headers): string {
  // Try X-Forwarded-For first (for proxied requests)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Try X-Real-IP
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a session-based identifier if available
  const sessionId = headers.get("x-session-id");
  if (sessionId) {
    return `session:${sessionId}`;
  }

  // Last resort: use a hash of user-agent + accept-language
  const ua = headers.get("user-agent") || "unknown";
  const lang = headers.get("accept-language") || "unknown";
  return `anonymous:${simpleHash(ua + lang)}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Configuraciones de rate limit por endpoint
// Límites generosos para usuarios legítimos, pero previenen abuso obvio
export const RATE_LIMITS = {
  // Orders: 10 por minuto (usuario normal crea 1-2)
  orders: { limit: 10, windowMs: 60 * 1000 },
  // Upload: 30 por minuto (usuario puede subir 20 fotos)
  upload: { limit: 30, windowMs: 60 * 1000 },
  // General API: 120 por minuto
  api: { limit: 120, windowMs: 60 * 1000 },
} as const;
