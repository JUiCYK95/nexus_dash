import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { WAHAClient } from '@/lib/waha-client'
import {
  withApiProtection,
  AuthenticatedRequest,
  createApiResponse,
  handleApiError
} from '@/lib/api-middleware'
import { enforceUsageLimit, trackUsage } from '@/lib/usage-tracker'

export async function POST(request: NextRequest) {
  return withApiProtection({
    permission: 'send_messages',
    usageMetric: 'messages_sent',
    rateLimit: { maxRequests: 1000, windowMs: 60000 } // 1000 requests per minute
  })(request, async (req: AuthenticatedRequest) => {
    try {
      const body = await request.json()
      const { contactId, message, sessionName = 'default', phoneNumber } = body
      const { userId, organizationId } = req.auth!

      if (!contactId || !message) {
        return createApiResponse(false, undefined, 'Contact ID and message are required', 400)
      }

      // Check usage limits before sending
      const usageCheck = await enforceUsageLimit(organizationId, 'messages_sent', 1)
      
      if (!usageCheck.allowed) {
        return createApiResponse(false, undefined, usageCheck.reason, 429)
      }

      const supabase = createServerSupabaseClient(request)

      // Get contact information if phoneNumber not provided
      let targetPhone = phoneNumber
      if (!targetPhone && contactId) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('phone_number')
          .eq('id', contactId)
          .eq('organization_id', organizationId)
          .single()

        targetPhone = contact?.phone_number
      }

      if (!targetPhone) {
        return createApiResponse(false, undefined, 'Phone number not found for contact', 404)
      }

      // Send message via WAHA
      let messageResponse
      try {
        // Create WAHA client for this organization
        const wahaClient = await WAHAClient.forOrganization(organizationId, request)

        // Use the session name from the organization settings
        const actualSessionName = wahaClient.sessionName || sessionName || 'default'
        console.log('📤 Sending message:', {
          organizationId,
          sessionName: actualSessionName,
          contactId,
          phoneNumber: targetPhone
        })

        const wahaResponse = await wahaClient.sendTextMessage(
          actualSessionName,
          targetPhone,
          message
        )

        messageResponse = {
          id: wahaResponse.id || wahaResponse.messageId || `msg_${Date.now()}`,
          message: message,
          contactId: contactId,
          phoneNumber: targetPhone,
          timestamp: new Date().toISOString(),
          status: 'sent',
          wahaResponse: wahaResponse
        }
      } catch (wahaError: any) {
        console.error('WAHA send error:', wahaError)

        // If WAHA fails, still save to DB but mark as failed
        messageResponse = {
          id: `msg_${Date.now()}`,
          message: message,
          contactId: contactId,
          phoneNumber: targetPhone,
          timestamp: new Date().toISOString(),
          status: 'failed',
          error: wahaError.message || 'WAHA service unavailable'
        }
      }

      // Store message in database
      const { error: dbError } = await supabase
        .from('messages')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          contact_id: contactId,
          phone_number: targetPhone,
          content: message,
          type: 'text',
          direction: 'outbound',
          status: messageResponse.status,
          external_id: messageResponse.id,
          sent_at: new Date().toISOString(),
          error_message: messageResponse.error || null
        })

      if (dbError) {
        console.error('Database error:', dbError)
        // Don't fail the request if database insert fails
      }

      // Track additional usage metrics
      await trackUsage(organizationId, 'api_calls', 1)

      return createApiResponse(true, {
        messageId: messageResponse.id,
        status: 'sent',
        message: messageResponse,
        usage: usageCheck.usageInfo
      })

    } catch (error: any) {
      console.error('Send message error:', error)
      return handleApiError(error)
    }
  })
}

async function updateDailyAnalytics(userId: string, type: 'sent' | 'received') {
  try {
    const supabaseAdmin = createServerSupabaseClient()
    const today = new Date().toISOString().split('T')[0]

    let { data: analytics } = await supabaseAdmin
      .from('message_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (!analytics) {
      await supabaseAdmin
        .from('message_analytics')
        .insert({
          user_id: userId,
          date: today,
          total_messages: 1,
          messages_sent: type === 'sent' ? 1 : 0,
          messages_received: type === 'received' ? 1 : 0,
          unique_contacts: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    } else {
      const updateData: any = {
        total_messages: analytics.total_messages + 1,
        updated_at: new Date().toISOString()
      }

      if (type === 'sent') {
        updateData.messages_sent = analytics.messages_sent + 1
      } else {
        updateData.messages_received = analytics.messages_received + 1
      }

      await supabaseAdmin
        .from('message_analytics')
        .update(updateData)
        .eq('id', analytics.id)
    }
  } catch (error) {
    console.error('Error updating analytics:', error)
  }
}