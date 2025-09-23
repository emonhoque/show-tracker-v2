import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimiters, createRateLimitHeaders } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'
import { clientEnv } from '@/lib/env'

// Generate nonce for CSP using Web Crypto API (Edge Runtime compatible)
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

// Create CSP header based on environment
function createCSPHeader(nonce: string, isDevelopment: boolean): string {
  if (isDevelopment) {
    // More permissive CSP for development
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://vercel.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.com https://api.spotify.com https://music.apple.com",
      "frame-src 'self' https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  }

  // Production CSP with nonces
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://vercel.live https://vercel.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.com https://api.spotify.com https://music.apple.com",
    "frame-src 'self' https://vercel.live",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isDevelopment = process.env.NODE_ENV === 'development'
  const nonce = generateNonce()

  // Handle API rate limiting
  if (pathname.startsWith('/api/')) {
    try {
      // Determine rate limiter based on endpoint
      let rateLimiter = rateLimiters.general
      
      if (pathname.includes('/auth/')) {
        rateLimiter = rateLimiters.auth
      } else if (pathname.includes('/upload-')) {
        rateLimiter = rateLimiters.upload
      } else if (pathname.includes('/search') || pathname.includes('/artists/search')) {
        rateLimiter = rateLimiters.search
      } else if (pathname.includes('/communities') && request.method === 'POST' && pathname.includes('/invites')) {
        rateLimiter = rateLimiters.strict
      } else if (
        // Read-only endpoints that are frequently called
        (pathname.includes('/shows/') && request.method === 'GET') ||
        (pathname.includes('/rsvps/') && request.method === 'GET') ||
        (pathname.includes('/profile') && request.method === 'GET') ||
        (pathname.includes('/communities') && request.method === 'GET') ||
        (pathname.includes('/categories/') && request.method === 'GET') ||
        (pathname.includes('/releases/') && request.method === 'GET')
      ) {
        rateLimiter = rateLimiters.readOnly
      }

      const limit = await rateLimiter.checkLimit(request)
      
      if (!limit.allowed) {
        logger.warn('Rate limit exceeded', {
          path: pathname,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
          retryAfter: limit.retryAfter
        })

        const response = NextResponse.json(
          { 
            error: 'Too many requests', 
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: limit.retryAfter 
          },
          { status: 429 }
        )

        // Add rate limit headers
        const headers = createRateLimitHeaders(limit)
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, String(value))
        })

        return response
      }

      // Create response with rate limit headers
      const response = NextResponse.next({ request })
      const headers = createRateLimitHeaders(limit)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, String(value))
      })

      return response
    } catch (error) {
      logger.error('Rate limiting error', { error, path: pathname })
      // Continue with request if rate limiting fails
    }
  }

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    const response = NextResponse.next()
    
    // Add security headers even for static files
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    return response
  }

  // Create Supabase client for middleware
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  
  // Refresh session if expired
  await supabase.auth.getUser()
  
  // Add security headers
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Add CSP header
  const cspHeader = createCSPHeader(nonce, isDevelopment)
  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)
  
  // Add nonce to response for use in components
  supabaseResponse.headers.set('X-Nonce', nonce)
  
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
