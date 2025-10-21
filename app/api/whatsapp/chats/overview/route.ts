import { NextRequest, NextResponse } from 'next/server'
import { WAHAClient } from '@/lib/waha-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentOrganizationMembership } from '@/lib/organization-helpers'

export async function GET(request: NextRequest) {
  try {
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

    // Get organization's session name
    const supabase = createServerSupabaseClient(request)
    const { data: org } = await supabase
      .from('organizations')
      .select('waha_session_name')
      .eq('id', membership.organization_id)
      .single()

    const sessionName = org?.waha_session_name || 'default'

    // Create WAHA client for this organization
    const wahaClient = await WAHAClient.forOrganization(membership.organization_id, request)

    // Fetch chats overview from WAHA
    const chatsOverview = await wahaClient.getChatsOverview(sessionName)

    console.log('📊 Chats Overview Response:', {
      sessionName,
      chatCount: chatsOverview?.length || 0,
      firstChat: chatsOverview?.[0],
      sampleTimestamp: chatsOverview?.[0]?.lastMessage?.timestamp
    })

    return NextResponse.json({
      success: true,
      chats: chatsOverview
    })
  } catch (error: any) {
    console.error('Error fetching chats overview:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chats overview',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

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

    // Get organization's session name
    const supabase = createServerSupabaseClient(request)
    const { data: org } = await supabase
      .from('organizations')
      .select('waha_session_name')
      .eq('id', membership.organization_id)
      .single()

    const sessionName = org?.waha_session_name || 'default'

    // Create WAHA client for this organization
    const wahaClient = await WAHAClient.forOrganization(membership.organization_id, request)

    // Fetch chats overview from WAHA with specific IDs
    const chatsOverview = await wahaClient.getChatsOverview(sessionName)

    return NextResponse.json({
      success: true,
      chats: chatsOverview
    })
  } catch (error: any) {
    console.error('Error fetching chats overview:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chats overview',
      details: error.message
    }, { status: 500 })
  }
}
