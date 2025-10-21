import { NextRequest, NextResponse } from 'next/server'
import { WAHAClient } from '@/lib/waha-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentOrganizationMembership } from '@/lib/organization-helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionName = searchParams.get('session') || 'default'

    // Get current organization membership
    const { user, membership, error } = await getCurrentOrganizationMembership(request)

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    if (!membership || error) {
      // Check if user has pending invitations
      const supabase = createServerSupabaseClient(request)
      const { data: invitations } = await supabase
        .from('organization_invitations')
        .select('organization:organizations(name)')
        .eq('email', user.email)
        .limit(1)

      return NextResponse.json({
        success: false,
        error: 'No organization membership found',
        details: {
          message: 'Du bist aktuell kein Mitglied einer Organisation.',
          suggestions: invitations && invitations.length > 0
            ? 'Du hast ausstehende Einladungen. Bitte akzeptiere die Einladung zuerst.'
            : 'Bitte kontaktiere einen Administrator, um zu einer Organisation hinzugefügt zu werden.',
          user_email: user.email,
          debug_endpoint: '/api/debug/org-check'
        }
      }, { status: 404 })
    }

    // Get organization's WAHA configuration
    const supabase = createServerSupabaseClient(request)
    const { data: org } = await supabase
      .from('organizations')
      .select('waha_session_name')
      .eq('id', membership.organization_id)
      .single()

    // Use organization's session name if not specified in query
    const finalSessionName = searchParams.get('session') || org?.waha_session_name || 'default'

    // Create WAHA client for this organization
    const wahaClient = await WAHAClient.forOrganization(membership.organization_id, request)

    // Get QR code from WAHA
    const qrData = await wahaClient.getQRCode(finalSessionName)

    return NextResponse.json({
      success: true,
      qr: qrData.data || qrData.qr || qrData.qrCode, // base64 image data
      mimetype: qrData.mimetype || 'image/png',
      session: finalSessionName
    })
  } catch (error: any) {
    // If WAHA is not available, return helpful error
    if (error.code === 'ECONNREFUSED' || error.response?.status === 404) {
      return NextResponse.json({
        success: false,
        error: 'WAHA service is not available. Please check WAHA_API_URL in environment variables.',
        details: error.message
      }, { status: 503 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to get QR code',
      details: error.message
    }, { status: 500 })
  }
}