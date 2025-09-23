/**
 * Rate limiting utility for API routes
 * Implements per-user and per-IP rate limiting
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: Request) => string // Custom key generator
  skipSuccessfulRequests?: boolean // Skip counting successful requests
  skipFailedRequests?: boolean // Skip counting failed requests
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  private generateKey(request: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request)
    }

    // Default: use IP address
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    return `rate_limit:${ip}`
  }

  private getUserKey(request: Request): string | null {
    // Try to get user ID from authorization header
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      // In a real implementation, you'd decode the JWT to get user ID
      // For now, we'll use the token as a proxy for user ID
      return `user_rate_limit:${token.slice(0, 20)}` // Use first 20 chars as key
    }
    return null
  }

  async checkLimit(request: Request): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    retryAfter?: number
  }> {
    const now = Date.now()
    // const windowStart = now - this.config.windowMs // Unused variable

    // Check IP-based rate limit
    const ipKey = this.generateKey(request)
    const ipEntry = rateLimitStore.get(ipKey) || { count: 0, resetTime: now + this.config.windowMs }
    
    if (ipEntry.resetTime < now) {
      ipEntry.count = 0
      ipEntry.resetTime = now + this.config.windowMs
    }

    ipEntry.count++
    rateLimitStore.set(ipKey, ipEntry)

    // Check user-based rate limit if available
    const userKey = this.getUserKey(request)
    let userEntry: RateLimitEntry | null = null
    
    if (userKey) {
      userEntry = rateLimitStore.get(userKey) || { count: 0, resetTime: now + this.config.windowMs }
      
      if (userEntry.resetTime < now) {
        userEntry.count = 0
        userEntry.resetTime = now + this.config.windowMs
      }

      userEntry.count++
      rateLimitStore.set(userKey, userEntry)
    }

    // Check if either limit is exceeded
    const ipExceeded = ipEntry.count > this.config.maxRequests
    const userExceeded = userEntry && userEntry.count > this.config.maxRequests

    if (ipExceeded || userExceeded) {
      const resetTime = Math.min(ipEntry.resetTime, userEntry?.resetTime || Infinity)
      const retryAfter = Math.ceil((resetTime - now) / 1000)
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.config.maxRequests - Math.max(ipEntry.count, userEntry?.count || 0)),
      resetTime: Math.min(ipEntry.resetTime, userEntry?.resetTime || Infinity)
    }
  }
}

// Pre-configured rate limiters for different endpoint types
export const rateLimiters = {
  // General API endpoints - 100 requests per 15 minutes
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }),

  // Authentication endpoints - 10 requests per 15 minutes
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10
  }),

  // Upload endpoints - 20 requests per hour
  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20
  }),

  // Search endpoints - 200 requests per 15 minutes
  search: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200
  }),

  // Strict rate limiting for sensitive operations
  strict: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5
  })
}

export function createRateLimitHeaders(limit: {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': limit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(limit.resetTime / 1000).toString()
  }

  if (limit.retryAfter) {
    headers['Retry-After'] = limit.retryAfter.toString()
  }

  return headers
}
