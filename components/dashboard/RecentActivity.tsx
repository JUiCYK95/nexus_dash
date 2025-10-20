'use client'

import { useState, useEffect } from 'react'
import {
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

export default function RecentActivity() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      // Fetch chats overview from WAHA - includes chat info and last message in one call
      const response = await fetch('/api/whatsapp/chats/overview')
      const data = await response.json()

      if (data.success && data.chats) {
        // Transform chats to activities, showing only chats with recent messages
        const recentActivities = data.chats
          .filter((chat: any) => chat.lastMessage) // Only chats with messages
          .slice(0, 5) // Get top 5 recent activities
          .map((chat: any) => {
            const lastMessage = chat.lastMessage
            const lastMessageTime = lastMessage?.timestamp

            // WAHA timestamps could be Unix seconds or ISO strings
            const messageTime = lastMessageTime
              ? (typeof lastMessageTime === 'number'
                  ? new Date(lastMessageTime * 1000) // If it's Unix seconds, multiply by 1000
                  : new Date(lastMessageTime))
              : new Date()

            // Calculate time ago
            const timeAgo = Math.floor((Date.now() - messageTime.getTime()) / (1000 * 60))
            let timeDisplay = ''

            if (timeAgo < 1) {
              timeDisplay = 'gerade eben'
            } else if (timeAgo < 60) {
              timeDisplay = `${timeAgo} Minuten`
            } else if (timeAgo < 1440) {
              timeDisplay = `${Math.floor(timeAgo / 60)} Stunden`
            } else {
              timeDisplay = `${Math.floor(timeAgo / 1440)} Tagen`
            }

            const contactName = chat.name || chat.id?.split('@')[0] || 'Unbekannt'
            const isOutgoing = lastMessage?.fromMe || false

            return {
              id: chat.id,
              type: 'message',
              title: isOutgoing
                ? `Nachricht gesendet an ${contactName}`
                : `Neue Nachricht von ${contactName}`,
              description: lastMessage?.body?.substring(0, 80) || 'Keine Nachricht',
              time: timeDisplay,
              icon: isOutgoing ? CheckCircleIcon : ChatBubbleLeftRightIcon,
              color: isOutgoing ? 'bg-green-500' : 'bg-blue-500',
              chatId: chat.id
            }
          })

        setActivities(recentActivities)
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewAllActivities = () => {
    // Since there's no dedicated activity page, navigate to analytics
    router.push('/dashboard/analytics')
  }

  const handleShowAllActivities = () => {
    router.push('/dashboard/analytics')
  }

  const handleActivityClick = (activity: any) => {
    // Navigate to chat with the specific contact
    if (activity.chatId) {
      router.push(`/dashboard/chat?contact=${activity.chatId}`)
    } else {
      router.push('/dashboard/chat')
    }
  }

  return (
    <div className="flow-root">
      <ul className="-mb-6">
        {activities.map((activity, index) => (
          <li key={activity.id} className="animate-slide-up" style={{ animationDelay: `${index * 150}ms` }}>
            <div className="relative pb-6">
              {index !== activities.length - 1 ? (
                <span className="absolute top-6 left-6 -ml-px h-full w-0.5 bg-gradient-to-b from-gray-600 to-transparent" />
              ) : null}
              <div 
                className="group relative flex space-x-4 cursor-pointer hover:bg-gray-700/50 p-3 rounded-xl transition-all duration-300"
                onClick={() => handleActivityClick(activity)}
              >
                <div>
                  <span className={`h-10 w-10 rounded-xl flex items-center justify-center ring-2 ring-gray-800 shadow-lg transition-transform duration-300 group-hover:scale-110 ${activity.color}`}>
                    <activity.icon className="h-4 w-4 text-white" />
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-gray-200 transition-colors">{activity.title}</p>
                    <p className="text-sm text-gray-400 mt-1">{activity.description}</p>
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full self-start">
                    vor {activity.time}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}