import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Note: Rate limiting and CSRF are temporarily disabled in middleware
// due to Edge Runtime compatibility issues. They can be re-enabled
// at the API route level for better control.

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Rate limiting is disabled in middleware for Edge Runtime compatibility
  // TODO: Implement rate limiting at API route level or use Edge-compatible solution

  // CSRF validation is disabled - handle at API route level instead
  // This allows for more granular control and better error handling

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

  // Redirect authenticated users away from auth pages (except reset-password)
  if (session && ['/login', '/register'].includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow reset-password page without session check (tokens are in URL hash)
  if (request.nextUrl.pathname === '/reset-password') {
    return response
  }

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
