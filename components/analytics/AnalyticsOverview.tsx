'use client'

import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  InboxIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface AnalyticsOverviewProps {
  data: {
    totalMessages: number
    messagesSent: number
    messagesReceived: number
    avgResponseTime: number
    messageGrowth: number
    responseRate: number
  }
}

export default function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const cards = [
    {
      name: 'Nachrichten Gesamt',
      value: data.totalMessages.toLocaleString(),
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
      change: `+${data.messageGrowth}%`,
      changeType: 'increase'
    },
    {
      name: 'Gesendete Nachrichten',
      value: data.messagesSent.toLocaleString(),
      icon: PaperAirplaneIcon,
      color: 'bg-whatsapp-500',
      change: '+8%',
      changeType: 'increase'
    },
    {
      name: 'Empfangene Nachrichten',
      value: data.messagesReceived.toLocaleString(),
      icon: InboxIcon,
      color: 'bg-purple-500',
      change: '+16%',
      changeType: 'increase'
    },
    {
      name: 'Durchschnittliche Antwortzeit',
      value: formatTime(data.avgResponseTime),
      icon: ClockIcon,
      color: 'bg-orange-500',
      change: '-30s',
      changeType: 'decrease'
    },
    {
      name: 'Nachrichtenwachstum',
      value: `${data.messageGrowth}%`,
      icon: ArrowTrendingUpIcon,
      color: 'bg-green-500',
      change: '+2.1%',
      changeType: 'increase'
    },
    {
      name: 'Antwortrate',
      value: `${data.responseRate}%`,
      icon: CheckCircleIcon,
      color: 'bg-indigo-500',
      change: '+5%',
      changeType: 'increase'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => (
        <div key={card.name} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/70 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-3 rounded-lg ${card.color}/20`}>
                  <card.icon className={`h-6 w-6 ${card.color.replace('bg-', 'text-').replace('-500', '-400')}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">{card.name}</p>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span
                  className={`text-sm font-medium ${
                    card.changeType === 'increase' 
                      ? 'text-green-400' 
                      : 'text-red-400'
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