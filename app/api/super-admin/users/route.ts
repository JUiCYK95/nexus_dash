import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    // First check if user is authenticated and is super admin
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

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is super admin
    const { data: superAdmin, error: superAdminError } = await supabase
      .from('super_admins')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (superAdminError || !superAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Now use service role key to get all users
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

    // Get all users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Get organization memberships
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        user_id,
        organization_id,
        role,
        is_active,
        organization:organizations(id, name)
      `)

    if (memberError) {
      console.error('Membership error:', memberError)
    }

    // Get super admins
    const { data: superAdmins, error: superAdminsError } = await supabaseAdmin
      .from('super_admins')
      .select('user_id')
      .eq('is_active', true)

    const superAdminIds = new Set(superAdmins?.map(sa => sa.user_id) || [])

    // Combine data
    const users = authUsers.users.map(authUser => {
      const userMemberships = memberships?.filter(m => m.user_id === authUser.id) || []

      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at,
        raw_user_meta_data: authUser.user_metadata,
        organizations: userMemberships.map(m => ({
          org_id: m.organization_id,
          org_name: m.organization?.name || 'Unknown',
          role: m.role,
          is_active: m.is_active
        })),
        is_super_admin: superAdminIds.has(authUser.id)
      }
    })

    return NextResponse.json({ users })

  } catch (error: any) {
    console.error('Error in users API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
