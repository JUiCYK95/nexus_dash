import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import nodemailer from 'nodemailer'

export async function POST(
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

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('organization_invitations')
      .select(`
        id,
        email,
        role,
        organization_id,
        invited_by,
        organization:organizations(id, name)
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Update expiry date to 7 days from now
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7)

    const { error: updateError } = await supabaseAdmin
      .from('organization_invitations')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send email notification
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
        to: invitation.email,
        subject: `Erinnerung: Einladung zur Organisation ${invitation.organization?.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Erinnerung: Einladung zur Organisation</h2>
            <p>Sie wurden zur Organisation <strong>${invitation.organization?.name}</strong> eingeladen.</p>
            <p>Ihre Rolle: <strong>${invitation.role}</strong></p>
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
    } catch (emailError) {
      console.error('Email error:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Einladung wurde erfolgreich erneut versendet',
      newExpiresAt: newExpiresAt.toISOString()
    })

  } catch (error: any) {
    console.error('Error resending invitation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
