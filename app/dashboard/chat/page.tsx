'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatWindow from '@/components/chat/ChatWindow'
import { createClient } from '@/lib/supabase'
import { fetchWithOrg } from '@/lib/api-utils'

function ChatPageContent() {
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    fetchContacts()
  }, [])

  // Handle contact selection from URL params
  useEffect(() => {
    const contactId = searchParams.get('contact')
    if (contactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id.toString() === contactId)
      if (contact) {
        setSelectedContact(contact)
      }
    }
  }, [searchParams, contacts])

  const fetchContacts = async () => {
    try {
      // Fetch real WhatsApp chats from WAHA
      const response = await fetchWithOrg('/api/whatsapp/chats')
      const data = await response.json()

      if (data.success && data.chats && data.chats.length > 0) {
        // Transform WAHA chats format to our UI format
        const transformedChats = data.chats.map((chat: any) => {
          // Calculate time display
          const lastMessageTime = chat.lastMessage?.timestamp
          let timeDisplay = ''

          if (lastMessageTime) {
            // WAHA timestamps could be Unix seconds or ISO strings
            const messageDate = typeof lastMessageTime === 'number'
              ? new Date(lastMessageTime * 1000) // If it's Unix seconds, multiply by 1000
              : new Date(lastMessageTime)

            const timeAgo = Math.floor((Date.now() - messageDate.getTime()) / (1000 * 60))

            if (timeAgo < 1) {
              timeDisplay = 'jetzt'
            } else if (timeAgo < 60) {
              timeDisplay = `${timeAgo} min`
            } else if (timeAgo < 1440) {
              timeDisplay = `${Math.floor(timeAgo / 60)} h`
            } else if (timeAgo < 10080) { // Less than 7 days
              timeDisplay = `${Math.floor(timeAgo / 1440)} d`
            } else {
              timeDisplay = messageDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
            }
          }

          return {
            id: chat.id,
            name: chat.name || chat.id?.split('@')[0] || 'Unknown',
            phone_number: chat.id?.replace('@c.us', '').replace('@g.us', '') || '',
            profile_picture_url: chat.picture || null,
            last_message: chat.lastMessage?.body || '',
            last_message_at: lastMessageTime || null,
            last_message_time: timeDisplay || '',
            updated_at: lastMessageTime || new Date().toISOString(),
            online: false,
            unread_count: chat.unreadCount || 0,
            isGroup: chat.id?.endsWith('@g.us') || false
          }
        })

        console.log(`✅ Loaded ${transformedChats.length} WhatsApp chats`)
        setContacts(transformedChats)
      } else {
        console.warn('No chats from WAHA, using mock data')
        const mockContacts = getMockContactsFromChats()
        setContacts(mockContacts)
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
      // Fallback to mock data on error
      const mockContacts = getMockContactsFromChats()
      setContacts(mockContacts)
    } finally {
      setLoading(false)
    }
  }

  // Generate mock contacts from automotive chats data
  const getMockContactsFromChats = () => {
    try {
      const { automotiveChats } = require('@/data/automotive-chats')
      return automotiveChats.map((chat: any) => {
        const lastMessage = chat.messages[chat.messages.length - 1]
        const timeAgo = Math.floor((Date.now() - new Date(lastMessage.timestamp).getTime()) / (1000 * 60))
        let timeDisplay = '2 min'
        
        if (timeAgo < 60) {
          timeDisplay = `${timeAgo} min`
        } else if (timeAgo < 1440) {
          timeDisplay = `${Math.floor(timeAgo / 60)} h`
        } else {
          timeDisplay = `${Math.floor(timeAgo / 1440)} d`
        }

        return {
          id: chat.contactId,
          name: chat.contactName,
          phone_number: `+49 15${Math.floor(Math.random() * 9)} ${Math.floor(Math.random() * 90000000) + 10000000}`,
          profile_picture_url: null,
          last_message: lastMessage.content.substring(0, 80) + (lastMessage.content.length > 80 ? '...' : ''),
          last_message_at: lastMessage.timestamp,
          last_message_time: timeDisplay,
          updated_at: lastMessage.timestamp,
          online: Math.random() > 0.6,
          unread_count: Math.floor(Math.random() * 3),
          vehicle: chat.vehicle,
          category: chat.category
        }
      })
    } catch (error) {
      // Ultra fallback
      return [
        {
          id: 1,
          name: 'Michael Weber',
          phone_number: '+49 151 2847563',
          profile_picture_url: null,
          last_message: 'Ist mein BMW schon fertig?',
          last_message_at: new Date().toISOString(),
          last_message_time: '2 min',
          updated_at: new Date().toISOString(),
          online: true,
          unread_count: 1,
          vehicle: 'BMW 320d (2019)',
          category: 'Service'
        }
      ]
    }
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-120px)] -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-10 -my-4 sm:-my-6 md:-my-8 overflow-hidden">
        {/* Chat Sidebar - Hidden on mobile when a chat is selected */}
        <div className={`${selectedContact ? 'hidden lg:block' : 'block'} w-full lg:w-auto h-full`}>
          <ChatSidebar
            contacts={contacts}
            selectedContact={selectedContact}
            onSelectContact={setSelectedContact}
            loading={loading}
          />
        </div>

        {/* Chat Window - Only visible on mobile when a chat is selected */}
        <div className={`${selectedContact ? 'block' : 'hidden lg:block'} w-full lg:flex-1 h-full`}>
          <ChatWindow
            selectedContact={selectedContact}
            onContactUpdate={fetchContacts}
            onBack={() => setSelectedContact(null)}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Lädt Chat...</div>
        </div>
      </DashboardLayout>
    }>
      <ChatPageContent />
    </Suspense>
  )
}