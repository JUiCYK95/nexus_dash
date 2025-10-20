import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendInvitationEmail } from '@/lib/email'

// Create admin client directly in the API route
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  try {
    const { email, role, organizationId, userId } = await request.json()

    if (!email || !role || !organizationId || !userId) {
      return NextResponse.json(
        { error: 'Email, Rolle, Organisation und Benutzer-ID sind erforderlich' },
        { status: 400 }
      )
    }

    console.log('Invite request:', { email, role, organizationId, userId })

    // Verify user has permission to invite members using admin client
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    console.log('Membership check:', { membership, membershipError })

    if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
      console.log('Permission denied:', { membershipError, membership })
      return NextResponse.json(
        { error: 'Keine Berechtigung zum Einladen von Mitgliedern' },
        { status: 403 }
      )
    }

    // Get organization details
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    // Create invitation token
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    console.log('Creating invitation with:', {
      organization_id: organizationId,
      email: email.toLowerCase(),
      role: role,
      invited_by: userId,
      token: inviteToken,
      expires_at: expiresAt.toISOString(),
      status: 'pending'
    })

    // Store invitation in database
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role: role,
        invited_by: userId,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      console.error('Full error details:', JSON.stringify(inviteError, null, 2))
      return NextResponse.json(
        { error: `Fehler beim Erstellen der Einladung: ${inviteError.message || 'Unbekannter Fehler'}` },
        { status: 500 }
      )
    }

    // Send email invitation
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/invite/${inviteToken}`

    // Get inviter details
    const { data: inviter } = await supabaseAdmin
      .from('auth.users')
      .select('raw_user_meta_data')
      .eq('id', userId)
      .single()

    const inviterName = inviter?.raw_user_meta_data?.full_name ||
                        inviter?.raw_user_meta_data?.name ||
                        undefined

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      to: email,
      organizationName: organization?.name || 'Unknown Organization',
      inviterName,
      role,
      inviteUrl,
      expiresInDays: 7
    })

    console.log('Email result:', emailResult)

    return NextResponse.json({
      success: true,
      message: `Einladung erfolgreich an ${email} gesendet`,
      inviteUrl: inviteUrl, // For development testing
      emailSent: emailResult.success,
      emailMessage: emailResult.message
    })

  } catch (error) {
    console.error('Error in invite API:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}