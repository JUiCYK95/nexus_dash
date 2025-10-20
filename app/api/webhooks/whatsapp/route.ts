import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('WhatsApp Webhook received:', body)

    // Validate webhook payload
    if (!body.event || !body.session || !body.payload) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const { event, session, payload } = body

    // Handle different webhook events
    switch (event) {
      case 'message':
      case 'message.any':
        await handleIncomingMessage(session, payload)
        break
      
      case 'session.status':
        await handleSessionStatus(session, payload)
        break
      
      default:
        console.log(`Unhandled webhook event: ${event}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleIncomingMessage(session: string, payload: any) {
  try {
    const { id, from, body, timestamp, type } = payload

    // Find user by session name
    const { data: userSession } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('user_id')
      .eq('session_name', session)
      .single()

    if (!userSession) {
      console.error('User session not found for session:', session)
      return
    }

    // Check if contact exists, create if not
    let { data: contact } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('id')
      .eq('user_id', userSession.user_id)
      .eq('contact_id', from)
      .single()

    if (!contact) {
      const { data: newContact } = await supabaseAdmin
        .from('whatsapp_contacts')
        .insert({
          user_id: userSession.user_id,
          contact_id: from,
          phone_number: from,
          name: from, // Will be updated with actual name later
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()
      
      contact = newContact
    }

    // Store the message
    if (contact?.id) {
      await supabaseAdmin
        .from('whatsapp_messages')
        .insert({
          user_id: userSession.user_id,
          contact_id: contact.id,
          message_id: id,
          content: body,
          message_type: type || 'text',
          is_outgoing: false,
          timestamp: new Date(timestamp * 1000).toISOString(),
          created_at: new Date().toISOString()
        })
    }

    // Update analytics
    await updateDailyAnalytics(userSession.user_id, 'received')

  } catch (error) {
    console.error('Error handling incoming message:', error)
  }
}

async function handleSessionStatus(session: string, payload: any) {
  try {
    const { status } = payload

    await supabaseAdmin
      .from('whatsapp_sessions')
      .update({
        session_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('session_name', session)

  } catch (error) {
    console.error('Error handling session status:', error)
  }
}

async function updateDailyAnalytics(userId: string, type: 'sent' | 'received') {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get or create today's analytics record
    let { data: analytics } = await supabaseAdmin
      .from('message_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (!analytics) {
      // Create new analytics record
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
      // Update existing analytics record
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