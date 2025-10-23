import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    // Prevent deleting yourself
    if (params.userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    // Use service role key to delete user
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

    // Delete user from auth (this will cascade delete related records due to foreign keys)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(params.userId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Benutzer erfolgreich gelöscht'
    })

  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
