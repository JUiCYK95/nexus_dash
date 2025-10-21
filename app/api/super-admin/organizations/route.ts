import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json()
    const { name, subscription_plan, subscription_status, owner_email, waha_api_url, waha_api_key } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })
    }

    if (!owner_email) {
      return NextResponse.json({ error: 'Owner E-Mail ist erforderlich' }, { status: 400 })
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // Use service role key to create organization
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

    // Check if slug already exists
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingOrg) {
      return NextResponse.json({ error: 'Dieser Slug wird bereits verwendet' }, { status: 400 })
    }

    // Create organization
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
        slug,
        subscription_plan: subscription_plan || 'starter',
        subscription_status: subscription_status || 'trialing',
        waha_api_url: waha_api_url || null,
        waha_api_key: waha_api_key || null,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json({ error: orgError.message }, { status: 500 })
    }

    let invitationSent = false

    // Check if user exists and add them as owner, or create invitation
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const ownerUser = authUsers?.users?.find((u: any) => u.email === owner_email)

    if (ownerUser) {
      // User exists - add them as organization owner
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: newOrg.id,
          user_id: ownerUser.id,
          role: 'owner',
          is_active: true,
        })

      if (memberError) {
        console.error('Error adding owner:', memberError)
      }
    } else {
      // User doesn't exist - create invitation
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      const { error: inviteError } = await supabaseAdmin
        .from('organization_invitations')
        .insert({
          organization_id: newOrg.id,
          email: owner_email,
          role: 'owner',
          token,
          expires_at: expiresAt.toISOString(),
        })

      if (inviteError) {
        console.error('Error creating invitation:', inviteError)
      } else {
        invitationSent = true
        // TODO: Send invitation email with token
      }
    }

    return NextResponse.json({
      organization: newOrg,
      invitation_sent: invitationSent
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error in organizations API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
