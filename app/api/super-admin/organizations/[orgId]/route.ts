import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    // Check if user is authenticated and is super admin
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

    // Use service role key
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

    const body = await request.json()
    const { name, subscription_plan, subscription_status, billing_email, waha_api_url, waha_api_key } = body

    // Build update object (only include fields that are provided)
    const updateData: any = {}
    if (name) updateData.name = name
    if (subscription_plan) updateData.subscription_plan = subscription_plan
    if (subscription_status) updateData.subscription_status = subscription_status
    if (billing_email !== undefined) updateData.billing_email = billing_email || null

    // Update organization
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', params.orgId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update organization settings if WAHA credentials are provided
    if (waha_api_url || waha_api_key) {
      const settingsUpdate: any = {}
      if (waha_api_url) settingsUpdate.waha_api_url = waha_api_url
      if (waha_api_key) settingsUpdate.waha_api_key = waha_api_key

      const { error: settingsError } = await supabaseAdmin
        .from('organization_settings')
        .upsert({
          organization_id: params.orgId,
          ...settingsUpdate
        })

      if (settingsError) {
        console.error('Settings update error:', settingsError)
        // Don't fail the whole request if settings update fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Organisation erfolgreich aktualisiert'
    })

  } catch (error: any) {
    console.error('Error updating organization:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
