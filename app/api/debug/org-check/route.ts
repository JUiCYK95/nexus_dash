import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's memberships
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select(`
        id,
        role,
        is_active,
        organization:organizations(
          id,
          name,
          slug,
          waha_api_url,
          waha_api_key
        )
      `)
      .eq('user_id', user.id)

    // Get all organizations (for comparison)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: allOrgs } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get pending invitations
    const { data: invitations } = await supabase
      .from('organization_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        organization:organizations(
          id,
          name,
          slug
        )
      `)
      .eq('email', user.email)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name
      },
      memberships: memberships || [],
      membershipCount: memberships?.length || 0,
      memberError: memberError?.message,
      invitations: invitations || [],
      recentOrganizations: allOrgs || [],
      localStorage: {
        current_organization_id: 'Check browser localStorage'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
