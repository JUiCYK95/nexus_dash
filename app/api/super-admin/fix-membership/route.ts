import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * Super Admin API to add a user to an organization
 * Use this to fix missing memberships
 */
export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json()
    const { user_email, organization_slug, role = 'owner' } = body

    if (!user_email || !organization_slug) {
      return NextResponse.json({
        error: 'user_email and organization_slug are required'
      }, { status: 400 })
    }

    // Use service role to make changes
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

    // Find organization by slug
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', organization_slug)
      .single()

    if (orgError || !org) {
      return NextResponse.json({
        error: 'Organization not found',
        slug: organization_slug
      }, { status: 404 })
    }

    // Find user by email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const targetUser = authUsers?.users?.find((u: any) => u.email === user_email)

    if (!targetUser) {
      return NextResponse.json({
        error: 'User not found',
        email: user_email,
        suggestion: 'User needs to register first'
      }, { status: 404 })
    }

    // Check if membership already exists
    const { data: existingMember } = await supabaseAdmin
      .from('organization_members')
      .select('*')
      .eq('organization_id', org.id)
      .eq('user_id', targetUser.id)
      .single()

    if (existingMember) {
      return NextResponse.json({
        success: true,
        message: 'Membership already exists',
        membership: existingMember
      })
    }

    // Add user as member
    const { data: newMember, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: targetUser.id,
        role: role,
        is_active: true,
      })
      .select()
      .single()

    if (memberError) {
      return NextResponse.json({
        error: 'Failed to add member',
        details: memberError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User added to organization successfully',
      membership: newMember,
      organization: org,
      user: {
        id: targetUser.id,
        email: targetUser.email
      }
    })

  } catch (error: any) {
    console.error('Error in fix-membership API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
