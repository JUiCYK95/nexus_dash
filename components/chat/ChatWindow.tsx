'use client'

import { useState, useEffect, useRef } from 'react'
import {
  PaperAirplaneIcon,
  UserIcon,
  PhoneIcon,
  VideoCameraIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  FaceSmileIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { fetchWithOrg } from '@/lib/api-utils'

interface ChatWindowProps {
  selectedContact: any
  onContactUpdate: () => void
  onBack?: () => void
}

export default function ChatWindow({ selectedContact, onContactUpdate, onBack }: ChatWindowProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showContactMenu, setShowContactMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (selectedContact) {
      fetchMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    if (!selectedContact) return

    setLoading(true)
    try {
      // Fetch messages from WAHA API
      const response = await fetchWithOrg(`/api/whatsapp/chats/${selectedContact.id}/messages?limit=100`)
      const data = await response.json()

      if (data.success && data.messages) {
        // Transform WAHA messages to our format
        const transformedMessages = data.messages.map((msg: any) => {
          // WAHA timestamps could be Unix seconds or ISO strings
          let timestamp = msg.timestamp
          if (typeof timestamp === 'number') {
            // Convert Unix seconds to ISO string
            timestamp = new Date(timestamp * 1000).toISOString()
          }

          // Log messages with media for debugging
          if (msg.media || msg.mediaUrl || msg.mediaKey) {
            console.log('📷 Message with media:', {
              type: msg.type,
              media: msg.media,
              mediaUrl: msg.mediaUrl,
              hasMediaKey: !!msg.mediaKey,
              body: msg.body,
              mimetype: msg.media?.mimetype,
              fullMessage: msg
            })
          }

          // Determine message type from media mimetype if type is not provided
          let messageType = msg.type || 'text'
          if (!msg.type && msg.media?.mimetype) {
            if (msg.media.mimetype.startsWith('image/')) {
              messageType = 'image'
            } else if (msg.media.mimetype.startsWith('video/')) {
              messageType = 'video'
            } else if (msg.media.mimetype.startsWith('audio/')) {
              messageType = 'audio'
            }
          }

          return {
            id: msg.id,
            content: msg.body || msg.text || '',
            is_outgoing: msg.fromMe || false,
            timestamp: timestamp || new Date().toISOString(),
            message_type: messageType,
            media: msg.media || msg.mediaUrl || null,
            mediaKey: msg.mediaKey || null
          }
        })

        // Sort messages by timestamp (oldest first, newest last)
        const sortedMessages = transformedMessages.sort((a: any, b: any) => {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        })

        console.log('📨 Messages sorted:', {
          total: sortedMessages.length,
          first: sortedMessages[0]?.timestamp,
          last: sortedMessages[sortedMessages.length - 1]?.timestamp
        })

        setMessages(sortedMessages)
      } else {
        // No messages found, show empty state
        setMessages([])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      // Fallback to empty messages on error
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !selectedContact) return

    setLoading(true)
    const messageToSend = message
    
    try {
      // Add message to local state immediately for better UX
      const newMessage = {
        id: Date.now(),
        content: messageToSend,
        is_outgoing: true,
        timestamp: new Date().toISOString(),
        message_type: 'text'
      }
      
      setMessages(prev => [...prev, newMessage])
      setMessage('')

      // Send message via API
      const response = await fetchWithOrg('/api/whatsapp/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: selectedContact.id,
          message: messageToSend
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const result = await response.json()
      toast.success('Nachricht gesendet!')
      onContactUpdate()
    } catch (error) {
      toast.error('Fehler beim Senden der Nachricht')
      console.error('Error sending message:', error)
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== Date.now()))
      setMessage(messageToSend) // Restore the message
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Mock file upload functionality
      toast.loading('Datei wird hochgeladen...')
      setTimeout(() => {
        toast.dismiss()
        toast.success(`${file.name} wurde gesendet!`)
        setShowFileUpload(false)
        onContactUpdate()
      }, 2000)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handlePhoneCall = () => {
    toast.success(`Rufe ${selectedContact.name || selectedContact.phone_number} an`)
  }

  const handleVideoCall = () => {
    toast.success(`Starte Videoanruf mit ${selectedContact.name || selectedContact.phone_number}`)
  }

  const handleContactMenuAction = (action: string) => {
    switch (action) {
      case 'block':
        toast.success('Kontakt blockiert')
        break
      case 'delete':
        toast.success('Chat gelöscht')
        break
      case 'info':
        toast('Kontaktinfo wird geöffnet', {
          icon: 'ℹ️',
        })
        break
      default:
        break
    }
    setShowContactMenu(false)
  }

  // Common emojis for quick selection
  const commonEmojis = ['😀', '😂', '🥰', '😍', '🤔', '👍', '👎', '❤️', '🔥', '💯', '😢', '😮']

  if (!selectedContact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <UserIcon className="h-16 w-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Wählen Sie einen Chat aus</h3>
          <p className="text-gray-400">Klicken Sie auf einen Kontakt, um die Unterhaltung zu beginnen</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 h-full overflow-hidden">
      {/* Chat Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Back Button for Mobile */}
            {onBack && (
              <button
                onClick={onBack}
                className="lg:hidden p-2 hover:bg-gray-700/50 rounded-full transition-colors flex-shrink-0"
                aria-label="Zurück zur Chat-Liste"
              >
                <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-300" />
              </button>
            )}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-600 rounded-full flex items-center justify-center">
                {selectedContact.profile_picture_url ? (
                  <img
                    src={selectedContact.profile_picture_url}
                    alt={selectedContact.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-300" />
                )}
              </div>
              {selectedContact.online && (
                <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-white truncate">
                {selectedContact.name || selectedContact.phone_number}
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                {selectedContact.online ? 'Online' : 'Zuletzt gesehen vor 5 Minuten'}
              </p>
              {selectedContact.vehicle && (
                <p className="text-xs text-gray-500 truncate hidden sm:block">
                  {selectedContact.vehicle}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <button
              onClick={handlePhoneCall}
              className="p-1.5 sm:p-2 hover:bg-gray-700/50 rounded-full transition-colors"
              aria-label="Anrufen"
            >
              <PhoneIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </button>
            <button
              onClick={handleVideoCall}
              className="hidden sm:block p-2 hover:bg-gray-700/50 rounded-full transition-colors"
              aria-label="Videoanruf"
            >
              <VideoCameraIcon className="h-5 w-5 text-gray-400" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowContactMenu(!showContactMenu)}
                className="p-1.5 sm:p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                aria-label="Menü"
              >
                <EllipsisVerticalIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </button>
              
              {/* Contact Menu Dropdown */}
              {showContactMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleContactMenuAction('info')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
                    >
                      Kontaktinfo
                    </button>
                    <button
                      onClick={() => handleContactMenuAction('block')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
                    >
                      Kontakt blockieren
                    </button>
                    <button
                      onClick={() => handleContactMenuAction('delete')}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20"
                    >
                      Chat löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-900">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Nachrichten werden geladen...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400">Noch keine Nachrichten</p>
              <p className="text-gray-500 text-sm mt-2">Schreiben Sie die erste Nachricht</p>
            </div>
          </div>
        ) : (
          messages.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex ${msg.is_outgoing ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.is_outgoing
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-white border border-gray-700'
              }`}
            >
              {/* Display image if message has media */}
              {msg.media && (msg.message_type === 'image' || msg.message_type === 'sticker') && (() => {
                let imageUrl = typeof msg.media === 'string'
                  ? msg.media
                  : (msg.media.url || msg.media.data)

                if (!imageUrl) {
                  console.warn('No image URL found for media message:', msg)
                  return null
                }

                // Convert WAHA media URL to our proxy URL
                // Example: https://botzimmerwa-dev.up.railway.app/api/files/n8n/true_123@c.us_ABC.jpeg
                // Becomes: /api/whatsapp/media/n8n/true_123@c.us_ABC.jpeg
                const mediaPathMatch = imageUrl.match(/\/api\/files\/(.+)$/)
                if (mediaPathMatch) {
                  imageUrl = `/api/whatsapp/media/${mediaPathMatch[1]}`
                }

                console.log('🖼️ Rendering image:', { originalUrl: msg.media.url, proxyUrl: imageUrl, type: msg.message_type })

                return (
                  <img
                    src={imageUrl}
                    alt="Bild"
                    className="rounded-lg mb-2 max-w-full h-auto"
                    onError={(e) => {
                      console.error('Image load error:', { url: imageUrl, media: msg.media })
                      e.currentTarget.style.display = 'none'
                    }}
                    onLoad={() => {
                      console.log('✅ Image loaded successfully:', imageUrl)
                    }}
                  />
                )
              })()}

              {/* Display video if message has video */}
              {msg.media && msg.message_type === 'video' && (() => {
                let videoUrl = typeof msg.media === 'string'
                  ? msg.media
                  : (msg.media.url || msg.media.data)

                if (!videoUrl) {
                  return null
                }

                // Convert WAHA media URL to our proxy URL
                const mediaPathMatch = videoUrl.match(/\/api\/files\/(.+)$/)
                if (mediaPathMatch) {
                  videoUrl = `/api/whatsapp/media/${mediaPathMatch[1]}`
                }

                return (
                  <video
                    src={videoUrl}
                    controls
                    className="rounded-lg mb-2 max-w-full h-auto"
                    onError={(e) => {
                      console.error('Video load error:', { url: videoUrl, media: msg.media })
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )
              })()}

              {/* Display message content */}
              {msg.content && (
                <p className="text-sm">{msg.content}</p>
              )}

              <p className={`text-xs mt-1 ${
                msg.is_outgoing ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button 
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
            >
              <PaperClipIcon className="h-5 w-5 text-gray-400" />
            </button>
            
            {/* File Upload Dropdown */}
            {showFileUpload && (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-10">
                <div className="py-1">
                  <label className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 cursor-pointer">
                    <PhotoIcon className="h-4 w-4 mr-3" />
                    Foto/Video
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <label className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 cursor-pointer">
                    <DocumentIcon className="h-4 w-4 mr-3" />
                    Dokument
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nachricht eingeben..."
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
              rows={1}
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
            >
              <FaceSmileIcon className="h-5 w-5 text-gray-400" />
            </button>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-300">Emojis</span>
                  <button 
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {commonEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="p-2 text-lg hover:bg-gray-700/50 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!message.trim() || loading}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}