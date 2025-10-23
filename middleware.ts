import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateCSRF, addCSRFTokenToResponse } from './lib/csrf'
import {
  authRateLimiter,
  apiRateLimiter,
  messagingRateLimiter,
  getClientIdentifier,
  createRateLimitResponse,
  addRateLimitHeaders
} from './lib/rate-limit'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Apply rate limiting based on route
  const pathname = request.nextUrl.pathname

  // Auth endpoints - strict rate limiting (5 req/15min)
  if (pathname.match(/^\/(login|register|api\/auth)/)) {
    const identifier = getClientIdentifier(request)
    const result = authRateLimiter.check(identifier)

    if (result.limited) {
      return createRateLimitResponse(result.resetTime)
    }
  }

  // Messaging endpoints - moderate rate limiting (30 req/min)
  if (pathname.startsWith('/api/whatsapp/send-message')) {
    const identifier = getClientIdentifier(request)
    const result = messagingRateLimiter.check(identifier)

    if (result.limited) {
      return createRateLimitResponse(result.resetTime)
    }
  }

  // General API endpoints - moderate rate limiting (100 req/min)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/webhooks/')) {
    const identifier = getClientIdentifier(request)
    const result = apiRateLimiter.check(identifier)

    if (result.limited) {
      return createRateLimitResponse(result.resetTime)
    }

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', '100')
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString())
  }

  // CSRF validation is disabled - handle at API route level instead
  // This allows for more granular control and better error handling
  // if (!validateCSRF(request)) {
  //   return NextResponse.json(
  //     { error: 'Invalid CSRF token', message: 'CSRF validation failed' },
  //     { status: 403 }
  //   )
  // }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get user session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect API routes (except webhooks and auth endpoints)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const isWebhook = request.nextUrl.pathname.startsWith('/api/webhooks/')
    const isAuth = request.nextUrl.pathname.startsWith('/api/auth/')

    if (!isWebhook && !isAuth && !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  // Protect super admin routes
  if (request.nextUrl.pathname.startsWith('/super-admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check super admin status
    const { data: superAdmin } = await supabase
      .from('super_admins')
      .select('is_active')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!superAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (session && ['/login', '/register'].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Add CSRF token to response for all requests
  response = addCSRFTokenToResponse(response)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
