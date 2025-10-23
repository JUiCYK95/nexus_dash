import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
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

    const invitationId = params.invitationId

    // Delete the invitation
    const { error: deleteError } = await supabaseAdmin
      .from('organization_invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Einladung erfolgreich widerrufen'
    })

  } catch (error: any) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
