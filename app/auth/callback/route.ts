import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  console.log('Auth callback called with:', { token_hash, type, url: requestUrl.toString() })

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Verify OTP with token_hash and type
    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (error) {
      console.error('Error verifying OTP:', error)
      return NextResponse.redirect(new URL('/login?error=auth_callback_failed', requestUrl.origin))
    }

    console.log('OTP verified successfully, type:', type)

    // If this is a password recovery, redirect to reset password page
    if (type === 'recovery') {
      console.log('Redirecting to reset-password page')
      return NextResponse.redirect(new URL('/reset-password', requestUrl.origin))
    }

    // Otherwise redirect to the next page
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  console.log('No token_hash or type found, redirecting to login')
  // If no token_hash or type, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
