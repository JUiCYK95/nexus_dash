import { NextRequest, NextResponse } from 'next/server'
import { WAHAClient } from '@/lib/waha-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentOrganizationMembership } from '@/lib/organization-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    const sessionName = org?.waha_session_name || 'default'

    // Create WAHA client for this organization
    const wahaClient = await WAHAClient.forOrganization(membership.organization_id, request)

    // Get messages from WAHA
    const messages = await wahaClient.getChatMessages(sessionName, chatId, limit, offset)

    return NextResponse.json({
      success: true,
      messages: messages,
      chatId: chatId
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get messages',
      details: error.message
    }, { status: 500 })
  }
}
