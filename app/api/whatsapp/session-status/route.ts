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
      return NextResponse.json({
        success: false,
        error: 'No organization found'
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

    // Get session status from WAHA
    const sessionData = await wahaClient.getSession(finalSessionName)

    return NextResponse.json({
      success: true,
      status: sessionData.status || 'unknown',
      name: finalSessionName,
      ...sessionData
    })
  } catch (error: any) {
    // If WAHA is not available, return helpful error
    if (error.code === 'ECONNREFUSED' || error.response?.status === 404) {
      return NextResponse.json({
        success: false,
        status: 'disconnected',
        error: 'WAHA service is not available',
        details: error.message
      }, { status: 503 })
    }

    return NextResponse.json({
      success: false,
      status: 'error',
      error: 'Failed to get session status',
      details: error.message
    }, { status: 500 })
  }
}