/**
 * Rate Limiting Utility
 * 
 * Simple in-memory rate limiting for API endpoints.
 * Prevents DDoS and spam attacks.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Check rate limit for an identifier
 * 
 * @param identifier - Unique identifier (e.g., sessionId, IP address)
 * @param maxRequests - Maximum requests allowed in the window (default: 30)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Object with success status and remaining info
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): { success: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      remaining: maxRequests - 1,
      resetIn: windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  };
}

/**
 * Reset rate limit for an identifier
 * 
 * @param identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get current rate limit status for an identifier
 * 
 * @param identifier - Unique identifier
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function getRateLimitStatus(
  identifier: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): { count: number; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    return {
      count: 0,
      remaining: maxRequests,
      resetIn: 0,
    };
  }

  return {
    count: entry.count,
    remaining: Math.max(0, maxRequests - entry.count),
    resetIn: entry.resetAt - now,
  };
}

/**
 * Create a rate limiter with fixed limits
 * Useful for creating specialized limiters
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (identifier: string) => checkRateLimit(identifier, maxRequests, windowMs);
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // For chat messages: 30 per minute
  chat: createRateLimiter(30, 60000),
  
  // For game actions: 60 per minute
  game: createRateLimiter(60, 60000),
  
  // For authentication: 5 per minute
  auth: createRateLimiter(5, 60000),
  
  // For API in general: 100 per minute
  api: createRateLimiter(100, 60000),
};
