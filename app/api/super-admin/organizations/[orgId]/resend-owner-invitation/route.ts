import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import nodemailer from 'nodemailer'

export async function POST(
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

    // Get organization and owner details
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select(`
        id,
        name,
        organization_members!inner (
          user_id,
          role
        )
      `)
      .eq('id', params.orgId)
      .eq('organization_members.role', 'owner')
      .eq('organization_members.is_active', true)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization or owner not found' }, { status: 404 })
    }

    const ownerId = (org.organization_members as any[])[0]?.user_id

    if (!ownerId) {
      return NextResponse.json({ error: 'No owner found for this organization' }, { status: 404 })
    }

    // Get owner email from auth.users
    const { data: ownerData, error: ownerError } = await supabaseAdmin.auth.admin.getUserById(ownerId)

    if (ownerError || !ownerData.user) {
      return NextResponse.json({ error: 'Owner user not found' }, { status: 404 })
    }

    const ownerEmail = ownerData.user.email

    // Check if there's a pending invitation for this owner
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('organization_invitations')
      .select('id')
      .eq('organization_id', params.orgId)
      .eq('email', ownerEmail)
      .is('accepted_at', null)
      .single()

    if (invitation) {
      // Update existing invitation with new expiry
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 7)

      const { error: updateError } = await supabaseAdmin
        .from('organization_invitations')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', invitation.id)

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Send email
      await sendInvitationEmail(ownerEmail, org.name, invitation.id)

      return NextResponse.json({
        success: true,
        message: 'Einladung wurde erfolgreich erneut versendet'
      })
    } else {
      return NextResponse.json({
        error: 'Keine ausstehende Einladung gefunden. Der Besitzer ist bereits Mitglied.',
        status: 404
      })
    }

  } catch (error: any) {
    console.error('Error resending owner invitation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function sendInvitationEmail(email: string, orgName: string, invitationId: string) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationId}`

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Erinnerung: Einladung zur Organisation ${orgName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Erinnerung: Einladung als Organisations-Besitzer</h2>
          <p>Sie wurden als Besitzer der Organisation <strong>${orgName}</strong> eingeladen.</p>
          <p>Diese Einladung ist noch <strong>7 Tage</strong> gültig.</p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}"
               style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Einladung annehmen
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Falls Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
          </p>
        </div>
      `,
    })
  } catch (error) {
    console.error('Email error:', error)
    // Don't fail the request if email fails
  }
}
