import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  maxRequests: number // Maximum requests per interval
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting (for production, use Redis or similar)
const rateLimitStore: RateLimitStore = {}

/**
 * Rate limiter implementation using sliding window
 */
export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  /**
   * Check if request should be rate limited
   * @param identifier - Unique identifier (e.g., user ID, IP address)
   * @returns true if rate limit exceeded, false otherwise
   */
  check(identifier: string): { limited: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const key = `${identifier}`

    // Clean up expired entries
    if (rateLimitStore[key] && now > rateLimitStore[key].resetTime) {
      delete rateLimitStore[key]
    }

    // Initialize or get current count
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        count: 0,
        resetTime: now + this.config.interval
      }
    }

    const record = rateLimitStore[key]

    // Check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      return {
        limited: true,
        remaining: 0,
        resetTime: record.resetTime
      }
    }

    // Increment count
    record.count++

    return {
      limited: false,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime
    }
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    delete rateLimitStore[identifier]
  }
}

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }

  // Get IP from headers (supports proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() :
             request.headers.get('x-real-ip') ||
             'unknown'

  return `ip:${ip}`
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(resetTime: number): NextResponse {
  const response = NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
    },
    { status: 429 }
  )

  response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString())
  response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString())

  return response
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetTime: number,
  limit: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString())

  return response
}

// =============================================
// PRECONFIGURED RATE LIMITERS
// =============================================

/**
 * Rate limiter for authentication endpoints (stricter)
 * 5 requests per 15 minutes
 */
export const authRateLimiter = new RateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5
})

/**
 * Rate limiter for API endpoints (moderate)
 * 100 requests per minute
 */
export const apiRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 100
})

/**
 * Rate limiter for messaging endpoints (stricter)
 * 30 requests per minute
 */
export const messagingRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 30
})

/**
 * Rate limiter for expensive operations (very strict)
 * 10 requests per 5 minutes
 */
export const expensiveOperationRateLimiter = new RateLimiter({
  interval: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10
})
