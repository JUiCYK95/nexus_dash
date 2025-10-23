import { NextRequest, NextResponse } from 'next/server'

/**
 * Generate a cryptographically secure CSRF token using Web Crypto API
 * Compatible with Edge Runtime
 */
export function generateCSRFToken(): string {
  // Use Web Crypto API which is available in Edge Runtime
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify CSRF token from cookie matches the token in request header
 */
export function verifyCSRFToken(
  cookieToken: string | undefined,
  headerToken: string | null
): boolean {
  if (!cookieToken || !headerToken) {
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken)
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Middleware to add CSRF token to response cookies
 */
export function addCSRFTokenToResponse(response: NextResponse): NextResponse {
  const token = generateCSRFToken()

  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  })

  return response
}

/**
 * Validate CSRF token for state-changing operations
 */
export function validateCSRF(request: NextRequest): boolean {
  // Only check for POST, PUT, DELETE, PATCH
  const method = request.method
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return true // GET requests don't need CSRF protection
  }

  // Skip CSRF for webhooks (they use other authentication)
  if (request.nextUrl.pathname.startsWith('/api/webhooks/')) {
    return true
  }

  const cookieToken = request.cookies.get('csrf-token')?.value
  const headerToken = request.headers.get('x-csrf-token')

  return verifyCSRFToken(cookieToken, headerToken)
}
