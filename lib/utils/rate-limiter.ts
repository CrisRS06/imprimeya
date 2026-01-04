/**
 * Simple in-memory rate limiter for API routes
 * For production with multiple instances, consider using Redis-based solution
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
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

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  // Orders: 5 per minute per IP
  orders: { limit: 5, windowMs: 60 * 1000 },
  // Upload: 10 per minute per IP
  upload: { limit: 10, windowMs: 60 * 1000 },
  // General API: 60 per minute per IP
  api: { limit: 60, windowMs: 60 * 1000 },
} as const;
