import { NextRequest, NextResponse } from 'next/server'
import { WAHAClient } from '@/lib/waha-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionName = 'default', webhookUrl } = body

    // Get user's organization
    const supabase = createServerSupabaseClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Get user's organization ID
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json({
        success: false,
        error: 'No organization found'
      }, { status: 404 })
    }

    // Get organization's WAHA configuration
    const { data: org } = await supabase
      .from('organizations')
      .select('waha_session_name')
      .eq('id', membership.organization_id)
      .single()

    // Use organization's session name if not specified in body
    const finalSessionName = sessionName !== 'default' ? sessionName : (org?.waha_session_name || 'default')

    // Get the webhook URL from environment or request
    const finalWebhookUrl = webhookUrl || process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
      : undefined

    // Create WAHA client for this organization
    const wahaClient = await WAHAClient.forOrganization(membership.organization_id, request)

    // Create session via WAHA
    const sessionData = await wahaClient.createSession(finalSessionName, finalWebhookUrl)

    return NextResponse.json({
      success: true,
      session: {
        name: finalSessionName,
        status: sessionData.status || 'created',
        webhookUrl: finalWebhookUrl,
        ...sessionData
      }
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
      error: 'Failed to create session',
      details: error.message
    }, { status: 500 })
  }
}