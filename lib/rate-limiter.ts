/**
 * Rate limiting utility for API routes
 * Implements per-user and per-IP rate limiting
 */

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: Request) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

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

    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    return `rate_limit:${ip}`
  }

  private getUserKey(request: Request): string | null {
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      return `user_rate_limit:${token.slice(0, 20)}`
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

    const ipKey = this.generateKey(request)
    const ipEntry = rateLimitStore.get(ipKey) || { count: 0, resetTime: now + this.config.windowMs }
    
    if (ipEntry.resetTime < now) {
      ipEntry.count = 0
      ipEntry.resetTime = now + this.config.windowMs
    }

    ipEntry.count++
    rateLimitStore.set(ipKey, ipEntry)

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

export const rateLimiters = {
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, 
    maxRequests: 1000
  }),

  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }),

  upload: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 100
  }),

  search: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 1000
  }),

  strict: new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 50
  }),

  readOnly: new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 2000
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
