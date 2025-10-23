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

    const body = await request.json()
    const { ownerEmail, userId } = body

    if (!ownerEmail && !userId) {
      return NextResponse.json({ error: 'Owner email or user ID is required' }, { status: 400 })
    }

    // Get organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', params.orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    let targetUserId = userId

    // If email is provided instead of userId, find or invite user
    if (ownerEmail && !userId) {
      // Check if user exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const foundUser = existingUser.users.find(u => u.email === ownerEmail)

      if (foundUser) {
        targetUserId = foundUser.id
      } else {
        // Create invitation for new user
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { data: invitation, error: inviteError } = await supabaseAdmin
          .from('organization_invitations')
          .insert({
            organization_id: params.orgId,
            email: ownerEmail,
            role: 'owner',
            invited_by: user.id,
            expires_at: expiresAt.toISOString()
          })
          .select('id')
          .single()

        if (inviteError) {
          console.error('Invitation error:', inviteError)
          return NextResponse.json({ error: inviteError.message }, { status: 500 })
        }

        // Send invitation email
        await sendInvitationEmail(ownerEmail, org.name, invitation.id)

        return NextResponse.json({
          success: true,
          message: 'Einladung an neuen Besitzer wurde versendet',
          invited: true
        })
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Could not determine user ID' }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', params.orgId)
      .eq('user_id', targetUserId)
      .single()

    if (existingMember) {
      // Update existing member to owner
      const { error: updateError } = await supabaseAdmin
        .from('organization_members')
        .update({ role: 'owner' })
        .eq('id', existingMember.id)

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      // Add user as owner
      const { error: insertError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: params.orgId,
          user_id: targetUserId,
          role: 'owner',
          is_active: true
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Besitzer erfolgreich zugewiesen'
    })

  } catch (error: any) {
    console.error('Error assigning owner:', error)
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
      subject: `Einladung als Besitzer der Organisation ${orgName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Einladung als Organisations-Besitzer</h2>
          <p>Sie wurden als Besitzer der Organisation <strong>${orgName}</strong> eingeladen.</p>
          <p>Diese Einladung ist <strong>7 Tage</strong> gültig.</p>
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
