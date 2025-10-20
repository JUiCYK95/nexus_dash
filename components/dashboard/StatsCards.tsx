'use client'

import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon, 
  InboxIcon, 
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface StatsCardsProps {
  stats: {
    totalMessages: number
    messagesSent: number
    messagesReceived: number
    activeContacts: number
    responseRate: number
    avgResponseTime: string
  }
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const statCards = [
    {
      name: 'Nachrichten Gesamt',
      value: stats.totalMessages.toLocaleString(),
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'increase'
    },
    {
      name: 'Gesendet',
      value: stats.messagesSent.toLocaleString(),
      icon: PaperAirplaneIcon,
      color: 'bg-whatsapp-500',
      change: '+8%',
      changeType: 'increase'
    },
    {
      name: 'Empfangen',
      value: stats.messagesReceived.toLocaleString(),
      icon: InboxIcon,
      color: 'bg-purple-500',
      change: '+16%',
      changeType: 'increase'
    },
    {
      name: 'Aktive Kontakte',
      value: stats.activeContacts.toString(),
      icon: UserGroupIcon,
      color: 'bg-orange-500',
      change: '+5%',
      changeType: 'increase'
    },
    {
      name: 'Antwortrate',
      value: `${stats.responseRate}%`,
      icon: ChartBarIcon,
      color: 'bg-green-500',
      change: '+3%',
      changeType: 'increase'
    },
    {
      name: 'Ø Antwortzeit',
      value: stats.avgResponseTime,
      icon: ClockIcon,
      color: 'bg-indigo-500',
      change: '-15s',
      changeType: 'decrease'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {statCards.map((card, index) => (
        <div
          key={card.name}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span
                  className={`text-sm font-medium ${
                    card.changeType === 'increase' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}
                >
                  {card.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">vs. letzten Monat</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}