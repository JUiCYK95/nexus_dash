'use client'

import { useState, useEffect } from 'react'
import {
  UserGroupIcon,
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  EllipsisVerticalIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { fetchWithOrg } from '@/lib/api-utils'

// Generate mock contacts from automotive chats data
const getMockContactsFromChats = () => {
  try {
    const { automotiveChats } = require('@/data/automotive-chats')
    return automotiveChats.map((chat: any) => {
      const lastMessage = chat.messages[chat.messages.length - 1]
      const categoryTags = {
        'Service': ['Service', 'Wartung'],
        'Terminbuchung': ['Termin', 'Inspektion'],
        'Ersatzteile': ['Ersatzteile', 'Reifen'],
        'Garantie': ['Garantie', 'Gewährleistung'],
        'Verkauf': ['Verkauf', 'Interessent'],
        'Reparatur': ['Reparatur', 'Service']
      }
      
      return {
        id: chat.contactId,
        name: chat.contactName,
        phone_number: `+49 15${Math.floor(Math.random() * 9)} ${Math.floor(Math.random() * 90000000) + 10000000}`,
        profile_picture_url: null,
        last_message: lastMessage.content.substring(0, 80) + (lastMessage.content.length > 80 ? '...' : ''),
        last_message_at: lastMessage.timestamp,
        online: Math.random() > 0.6,
        message_count: chat.messages.length * 8 + Math.floor(Math.random() * 50),
        tags: categoryTags[chat.category as keyof typeof categoryTags] || ['Kunde'],
        vehicle: chat.vehicle,
        notes: `Kunde mit ${chat.vehicle} - ${chat.category}`
      }
    })
  } catch (error) {
    // Fallback data
    return [
      {
        id: 1,
        name: 'Michael Weber',
        phone_number: '+49 151 2847563',
        profile_picture_url: null,
        last_message: 'Ist mein BMW schon fertig?',
        last_message_at: '2024-01-15T10:30:00Z',
        online: true,
        message_count: 245,
        tags: ['Stammkunde', 'Service'],
        vehicle: 'BMW 320d (2019)',
        notes: 'Regelmäßige Wartungen, sehr zufrieden'
      }
    ]
  }
}

const mockContacts = getMockContactsFromChats()

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMenuId, setShowMenuId] = useState<number | null>(null)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchContacts()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenuId !== null) {
        const target = event.target as HTMLElement
        if (!target.closest('.relative')) {
          setShowMenuId(null)
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMenuId])

  const fetchContacts = async () => {
    try {
      // Fetch real WhatsApp contacts from WAHA
      const response = await fetchWithOrg('/api/whatsapp/contacts')
      const data = await response.json()

      if (data.success && data.contacts) {
        // Transform WAHA contact format to our UI format
        // Filter to show ONLY contacts that are saved (isMyContact = true) AND exclude @lid contacts
        const transformedContacts = data.contacts
          .filter((contact: any) =>
            contact.isMyContact === true &&
            !contact.id?.includes('@lid') // Keine LID-Kontakte anzeigen
          )
          .map((contact: any) => ({
            id: contact.id || contact.contactId,
            name: contact.name || contact.pushname || contact.id?.split('@')[0] || 'Unknown',
            phone_number: contact.id?.replace('@c.us', '') || contact.number || '',
            profile_picture_url: contact.profilePicUrl || null,
            last_message: null,
            last_message_at: null,
            online: false,
            message_count: 0,
            tags: ['Gespeichert'],
            isMyContact: true,
            isWAContact: contact.isWAContact || true
          }))
          .sort((a, b) => {
            // Alphabetische Sortierung A-Z nach Name
            const nameA = a.name.toLowerCase()
            const nameB = b.name.toLowerCase()
            return nameA.localeCompare(nameB, 'de')
          })

        console.log(`✅ Loaded ${transformedContacts.length} saved WhatsApp contacts (filtered from ${data.contacts.length} total)`)
        setContacts(transformedContacts)

        if (transformedContacts.length === 0) {
          toast('Keine gespeicherten Kontakte gefunden', {
            icon: 'ℹ️',
          })
        }
      } else {
        console.warn('Failed to load WhatsApp contacts, using mock data')
        setContacts(mockContacts)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      // Fallback to mock data if API fails
      setContacts(mockContacts)
      toast.error('WhatsApp-Kontakte konnten nicht geladen werden. Mock-Daten werden angezeigt.')
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone_number.includes(searchTerm)
    
    if (selectedFilter === 'all') return matchesSearch
    if (selectedFilter === 'online') return matchesSearch && contact.online
    if (selectedFilter === 'offline') return matchesSearch && !contact.online
    
    return matchesSearch
  })

  const formatLastMessage = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Heute'
    if (diffDays === 2) return 'Gestern'
    if (diffDays <= 7) return `${diffDays} Tage`
    return date.toLocaleDateString('de-DE')
  }

  const getTagColor = (tag: string) => {
    const colors = {
      'Kunde': 'bg-blue-100 text-blue-800',
      'VIP': 'bg-purple-100 text-purple-800',
      'Familie': 'bg-green-100 text-green-800',
      'Kollege': 'bg-yellow-100 text-yellow-800',
      'Stammkunde': 'bg-indigo-100 text-indigo-800',
      'Interessent': 'bg-gray-100 text-gray-800'
    }
    return colors[tag as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast.error('Name und Telefonnummer sind erforderlich')
      return
    }

    try {
      // Mock API call - in production, this would save to database
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const contact = {
        id: Date.now(),
        name: newContact.name,
        phone_number: newContact.phone,
        email: newContact.email,
        profile_picture_url: null,
        last_message: null,
        last_message_at: null,
        online: false,
        message_count: 0,
        tags: ['Neu']
      }
      
      setContacts([contact, ...contacts])
      setNewContact({ name: '', phone: '', email: '' })
      setShowAddModal(false)
      toast.success('Kontakt erfolgreich hinzugefügt!')
    } catch (error) {
      toast.error('Fehler beim Hinzufügen des Kontakts')
    }
  }

  const handleChatClick = (contact: any) => {
    // Navigate to chat with selected contact
    router.push(`/dashboard/chat?contact=${contact.id}`)
  }

  const handlePhoneClick = (contact: any) => {
    // Mock phone call functionality
    toast.success(`Rufe ${contact.name} an (${contact.phone_number})`)
  }

  const handleMenuClick = (contactId: number) => {
    setShowMenuId(showMenuId === contactId ? null : contactId)
  }

  const handleEditContact = (contact: any) => {
    toast('Bearbeiten-Funktion wird entwickelt', {
      icon: 'ℹ️',
    })
    setShowMenuId(null)
  }

  const handleDeleteContact = async (contact: any) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      setContacts(contacts.filter(c => c.id !== contact.id))
      toast.success(`${contact.name} wurde entfernt`)
      setShowMenuId(null)
    } catch (error) {
      toast.error('Fehler beim Löschen des Kontakts')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Kontakte</h1>
            <p className="text-gray-400">Verwalten Sie Ihre WhatsApp-Kontakte</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setLoading(true)
                fetchContacts()
                toast.success('Kontakte werden aktualisiert...')
              }}
              disabled={loading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Aktualisieren</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Kontakt hinzufügen</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Gesamt Kontakte</p>
                <p className="text-2xl font-bold text-white">{contacts.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <UserIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Online</p>
                <p className="text-2xl font-bold text-white">{contacts.filter(c => c.online).length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-600/20 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Aktive Chats</p>
                <p className="text-2xl font-bold text-white">{contacts.filter(c => c.last_message_at).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Kontakte suchen..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setSelectedFilter('online')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFilter === 'online' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Online
              </button>
              <button
                onClick={() => setSelectedFilter('offline')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFilter === 'offline' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Offline
              </button>
            </div>
          </div>
        </div>

        {/* Contacts List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Kontakte ({filteredContacts.length})</h3>
            
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                    <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 transition-colors">
                    <div className="flex items-center space-x-4">
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
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"></div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-white">{contact.name}</h4>
                          <div className="flex space-x-1">
                            {contact.tags?.map((tag: string) => (
                              <span key={tag} className="px-2 py-1 text-xs rounded-full bg-blue-600/20 text-blue-300">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-400">{contact.phone_number}</p>
                        {contact.vehicle && (
                          <p className="text-xs text-gray-500 mt-1">
                            {contact.vehicle}
                          </p>
                        )}
                        {contact.last_message && (
                          <p className="text-xs text-gray-400 mt-1">
                            {contact.last_message} • {formatLastMessage(contact.last_message_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right mr-4">
                        <p className="text-sm text-gray-400">{contact.message_count} Nachrichten</p>
                        <p className="text-xs text-gray-500">
                          {contact.online ? 'Online' : 'Offline'}
                        </p>
                      </div>
                      
                      <button 
                        onClick={() => handleChatClick(contact)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-full transition-colors"
                      >
                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handlePhoneClick(contact)}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/20 rounded-full transition-colors"
                      >
                        <PhoneIcon className="h-5 w-5" />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => handleMenuClick(contact.id)}
                          className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-600/50 rounded-full transition-colors"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {showMenuId === contact.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => handleEditContact(contact)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
                              >
                                <PencilIcon className="h-4 w-4 mr-3" />
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDeleteContact(contact)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20"
                              >
                                <TrashIcon className="h-4 w-4 mr-3" />
                                Löschen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredContacts.length === 0 && (
                  <div className="text-center py-12">
                    <UserGroupIcon className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Keine Kontakte gefunden</h3>
                    <p className="text-gray-400">
                      {searchTerm ? 'Versuchen Sie einen anderen Suchbegriff' : 'Fügen Sie Ihren ersten Kontakt hinzu'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Kontakt hinzufügen</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  placeholder="Max Mustermann"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Telefonnummer *
                </label>
                <input
                  type="tel"
                  placeholder="+49 151 1234567"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  placeholder="max@example.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddContact}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}