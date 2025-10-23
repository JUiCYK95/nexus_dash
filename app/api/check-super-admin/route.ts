import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Debug route to check super admin status
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: 'Not authenticated',
        userError: userError?.message
      })
    }

    // Check super_admins table
    const { data: superAdmin, error: superAdminError } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Check if user is super admin using the function
    const { data: isSuperAdminResult, error: functionError } = await supabase
      .rpc('is_super_admin', { check_user_id: user.id })

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      superAdminTableEntry: superAdmin || null,
      superAdminTableError: superAdminError?.message || null,
      isSuperAdminFunction: isSuperAdminResult,
      functionError: functionError?.message || null,
      rawMetadata: user.user_metadata,
      appMetadata: user.app_metadata
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
