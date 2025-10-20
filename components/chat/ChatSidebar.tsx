'use client'

import { useState } from 'react'
import { 
  MagnifyingGlassIcon, 
  UserIcon, 
  PlusIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'

interface ChatSidebarProps {
  contacts: any[]
  selectedContact: any
  onSelectContact: (contact: any) => void
  loading: boolean
}

export default function ChatSidebar({ 
  contacts, 
  selectedContact, 
  onSelectContact, 
  loading 
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone_number?.includes(searchTerm)
  )

  // Mock contacts for demonstration
  const mockContacts = [
    { 
      id: 1, 
      name: 'Anna Müller', 
      phone_number: '+49 176 12345678', 
      last_message: 'Hallo, wie geht es dir?', 
      last_message_time: '2 min',
      unread_count: 2,
      online: true,
      profile_picture_url: null
    },
    { 
      id: 2, 
      name: 'Max Schmidt', 
      phone_number: '+49 175 87654321', 
      last_message: 'Können wir uns morgen treffen?', 
      last_message_time: '15 min',
      unread_count: 0,
      online: false,
      profile_picture_url: null
    },
    { 
      id: 3, 
      name: 'Laura Weber', 
      phone_number: '+49 172 98765432', 
      last_message: 'Danke für die Info!', 
      last_message_time: '1 h',
      unread_count: 1,
      online: true,
      profile_picture_url: null
    },
    { 
      id: 4, 
      name: 'Tom Fischer', 
      phone_number: '+49 171 56789012', 
      last_message: 'Bis später!', 
      last_message_time: '2 h',
      unread_count: 0,
      online: false,
      profile_picture_url: null
    },
    { 
      id: 5, 
      name: 'Sarah Klein', 
      phone_number: '+49 173 34567890', 
      last_message: 'Perfekt, danke!', 
      last_message_time: '3 h',
      unread_count: 0,
      online: true,
      profile_picture_url: null
    }
  ]

  const displayContacts = filteredContacts.length > 0 ? filteredContacts : (contacts.length > 0 ? contacts : mockContacts)

  return (
    <div className="w-80 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Chats</h2>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
              <PlusIcon className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
              <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Kontakte durchsuchen..."
            className="w-full pl-10 pr-4 py-2 border border-gray-600/50 rounded-lg bg-gray-700/50 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-4 text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Lade Kontakte...
          </div>
        ) : displayContacts.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <UserIcon className="h-12 w-12 mx-auto mb-2 text-gray-600" />
            <p>Keine Kontakte gefunden</p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={`p-4 hover:bg-gray-700/50 cursor-pointer transition-colors ${
                  selectedContact?.id === contact.id ? 'bg-blue-600/20 border-r-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                      {contact.profile_picture_url ? (
                        <img 
                          src={contact.profile_picture_url} 
                          alt={contact.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    {contact.online && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white truncate">
                        {contact.name || contact.phone_number}
                      </p>
                      <span className="text-xs text-gray-400">
                        {contact.last_message_time}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-400 truncate">
                        {contact.last_message || 'Keine Nachrichten'}
                      </p>
                      {contact.unread_count > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {contact.unread_count}
                        </span>
                      )}
                    </div>
                    
                    {contact.vehicle && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {contact.vehicle}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}