'use client'

import { useState, useEffect } from 'react'
import { UserIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { fetchWithOrg } from '@/lib/api-utils'

export default function ContactsOverview() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchTopContacts()
  }, [])

  const fetchTopContacts = async () => {
    try {
      // Fetch chats overview from WAHA - includes chat info and last message in one call
      const response = await fetchWithOrg('/api/whatsapp/chats/overview')
      const data = await response.json()

      if (data.success && data.chats) {
        // Transform and get top 8 chats
        const topChats = data.chats.slice(0, 8).map((chat: any) => {
          const lastMessageTime = chat.lastMessage?.timestamp
          let timeDisplay = ''

          if (lastMessageTime) {
            // WAHA timestamps could be Unix milliseconds or ISO strings
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
            phone: chat.id?.replace('@c.us', '').replace('@g.us', '') || '',
            lastMessage: chat.lastMessage?.body?.substring(0, 50) || 'Keine Nachricht',
            time: timeDisplay || 'N/A',
            avatar: chat.picture || null,
            online: false,
            unreadCount: chat.unreadCount || 0
          }
        })

        setContacts(topChats)
      }
    } catch (error) {
      console.error('Error fetching top contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContactClick = (contact: any) => {
    router.push(`/dashboard/chat?contact=${contact.id}`)
  }

  return (
    <div className="space-y-4">
      {contacts.map((contact: any, index: number) => (
        <div 
          key={contact.id} 
          onClick={() => handleContactClick(contact)}
          className="group flex items-center p-3 hover:bg-gray-700/50 rounded-xl cursor-pointer transition-all duration-300"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-gray-300" />
            </div>
            {contact.online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
            )}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white truncate">{contact.name}</p>
              <span className="text-xs text-gray-400">{contact.time}</span>
            </div>
            <p className="text-sm text-gray-400 truncate mt-1">{contact.lastMessage}</p>
            {contact.vehicle && (
              <p className="text-xs text-gray-500 mt-1">{contact.vehicle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}