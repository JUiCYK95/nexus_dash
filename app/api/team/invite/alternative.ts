import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { email, role, organizationId, userId } = await request.json()

    if (!email || !role || !organizationId || !userId) {
      return NextResponse.json(
        { error: 'Email, Rolle, Organisation und Benutzer-ID sind erforderlich' },
        { status: 400 }
      )
    }

    // Verify user has permission to invite members using admin client
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
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
      return NextResponse.json(
        { error: 'Fehler beim Erstellen der Einladung' },
        { status: 500 }
      )
    }

    // Send email invitation (development mode - log to console)
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/invite/${inviteToken}`
    
    console.log('=== EMAIL INVITATION ===')
    console.log(`📧 An: ${email}`)
    console.log(`🏢 Organisation: ${organization?.name}`)
    console.log(`👤 Rolle: ${role}`)
    console.log(`🔗 Einladungslink: ${inviteUrl}`)
    console.log(`🔑 Token: ${inviteToken}`)
    console.log('========================')

    return NextResponse.json({
      success: true,
      message: `Einladung erfolgreich an ${email} gesendet`,
      inviteUrl: inviteUrl // For development testing
    })

  } catch (error) {
    console.error('Error in invite API:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}