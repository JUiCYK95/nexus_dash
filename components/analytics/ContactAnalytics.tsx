'use client'

import { UserIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

// Generate top contacts from automotive chats data
const getTopContactsFromChats = () => {
  try {
    const { automotiveChats } = require('@/data/automotive-chats')
    return automotiveChats.slice(0, 5).map((chat: any, index: number) => ({
      name: chat.contactName,
      messages: 250 - (index * 20) + Math.floor(Math.random() * 30),
      growth: Math.floor(Math.random() * 30) - 10, // Random growth between -10 and +20
      avatar: null,
      vehicle: chat.vehicle
    })).sort((a: any, b: any) => b.messages - a.messages)
  } catch (error) {
    // Fallback data
    return [
      { name: 'Michael Weber', messages: 245, growth: 12, avatar: null, vehicle: 'BMW 320d' },
      { name: 'Petra Schneider', messages: 189, growth: -5, avatar: null, vehicle: 'Audi A4' },
      { name: 'Frank Müller', messages: 156, growth: 8, avatar: null, vehicle: 'VW Golf 8' },
      { name: 'Andrea Fischer', messages: 134, growth: 15, avatar: null, vehicle: 'Mercedes C-Klasse' },
      { name: 'Klaus Richter', messages: 128, growth: 3, avatar: null, vehicle: 'Opel Insignia' },
    ]
  }
}

const topContacts = getTopContactsFromChats()

const contactStats = [
  { label: 'Aktive Kunden', value: '142', change: '+8', changeType: 'increase' },
  { label: 'Neue Kunden', value: '23', change: '+12', changeType: 'increase' },
  { label: 'Service-Termine', value: '18', change: '+3', changeType: 'increase' },
  { label: 'Ø Nachrichten/Kunde', value: '15.2', change: '+2.1', changeType: 'increase' },
]

export default function ContactAnalytics() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Kontakt Analytics</h3>
          <p className="text-sm text-gray-500">Einblicke in Ihre Kontakt-Interaktionen</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Contact Stats */}
        <div className="grid grid-cols-2 gap-4">
          {contactStats.map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`flex items-center space-x-1 ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.changeType === 'increase' ? (
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">{stat.change}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Contacts */}
        <div>
          <h4 className="text-md font-medium text-white mb-4">Top Kunden nach Aktivität</h4>
          <div className="space-y-3">
            {topContacts.map((contact: any, index: number) => (
              <div key={contact.name} className="flex items-center justify-between p-3 bg-gray-800/50 backdrop-blur-sm rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-whatsapp-500 text-white rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 bg-gray-700/50 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.messages} Nachrichten • {contact.vehicle}</p>
                  </div>
                </div>
                <div className={`flex items-center space-x-1 ${
                  contact.growth > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {contact.growth > 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">{contact.growth}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}