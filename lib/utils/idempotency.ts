/**
 * Simple in-memory idempotency store
 * For production, use Redis/Vercel KV
 */

interface IdempotencyEntry {
  response: unknown;
  status: number;
  expiresAt: number;
}

const store = new Map<string, IdempotencyEntry>();

// TTL: 24 hours
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt < now) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check if an idempotency key exists and return cached response
 */
export function getIdempotentResponse(key: string): IdempotencyEntry | null {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }

  // Check expiration
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }

  return entry;
}

/**
 * Store a response for an idempotency key
 */
export function setIdempotentResponse(
  key: string,
  response: unknown,
  status: number
): void {
  store.set(key, {
    response,
    status,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  });
}

/**
 * Generate idempotency key from request data
 * Uses client ID + content hash
 */
export function generateIdempotencyKey(
  clientId: string,
  body: unknown
): string {
  const content = JSON.stringify(body);
  // Simple hash for deduplication
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `order:${clientId}:${hash.toString(36)}`;
}

/**
 * Get idempotency key from request header
 */
export function getIdempotencyKeyFromHeader(headers: Headers): string | null {
  return headers.get("Idempotency-Key") || headers.get("X-Idempotency-Key");
}
