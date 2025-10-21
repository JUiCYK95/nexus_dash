'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import PageTransition from '@/components/ui/PageTransition'
import Logo from '@/components/Logo'
import OrganizationSwitcher from '@/components/OrganizationSwitcher'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { member, organization } = useTenant()

  useEffect(() => {
    checkUser()
    loadNotifications()
  }, [])

  useEffect(() => {
    // Simulate real-time notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.9) { // 10% chance every 30 seconds
        addNewNotification()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [notifications.length])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
    } catch (error) {
      console.log('Auth check failed, using mock user')
      // For development: Use mock user
      setUser({ email: 'demo@example.com', user_metadata: { full_name: 'Demo User' } })
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.log('Logout failed, using manual redirect')
    }
    toast.success('Erfolgreich abgemeldet')
    router.push('/login')
  }

  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    if (!term.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    
    try {
      // Mock search results - in production, this would search through contacts, messages, etc.
      const mockResults = [
        { id: 1, type: 'contact', name: 'Anna Müller', phone: '+49 151 1234567', match: 'contact' },
        { id: 2, type: 'contact', name: 'Max Schmidt', phone: '+49 152 7654321', match: 'contact' },
        { id: 3, type: 'message', content: 'Hallo! Wie geht es dir?', contact: 'Anna Müller', match: 'message' },
        { id: 4, type: 'message', content: 'Danke für die Information', contact: 'Max Schmidt', match: 'message' }
      ].filter(item => 
        item.name?.toLowerCase().includes(term.toLowerCase()) ||
        item.phone?.includes(term) ||
        item.content?.toLowerCase().includes(term.toLowerCase()) ||
        item.contact?.toLowerCase().includes(term.toLowerCase())
      )
      
      setSearchResults(mockResults.slice(0, 5)) // Limit to 5 results
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSelect = (result: any) => {
    if (result.type === 'contact') {
      router.push('/dashboard/contacts')
    } else if (result.type === 'message') {
      router.push('/dashboard/chat')
    }
    setSearchTerm('')
    setSearchResults([])
  }

  const loadNotifications = () => {
    // Mock notifications
    const mockNotifications = [
      {
        id: 1,
        type: 'message',
        title: 'Neue Nachricht',
        message: 'Anna Müller hat Ihnen eine Nachricht gesendet',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        read: false,
        avatar: null
      },
      {
        id: 2,
        type: 'system',
        title: 'WhatsApp verbunden',
        message: 'Ihr WhatsApp-Account wurde erfolgreich verbunden',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        read: true,
        avatar: null
      },
      {
        id: 3,
        type: 'contact',
        title: 'Neuer Kontakt',
        message: 'Max Schmidt wurde zu Ihren Kontakten hinzugefügt',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        read: false,
        avatar: null
      }
    ]
    
    setNotifications(mockNotifications)
    setUnreadCount(mockNotifications.filter(n => !n.read).length)
  }

  const addNewNotification = () => {
    const newNotification = {
      id: Date.now(),
      type: 'message',
      title: 'Neue Nachricht',
      message: `${['Laura Weber', 'Tom Fischer', 'Sarah Klein'][Math.floor(Math.random() * 3)]} hat Ihnen eine Nachricht gesendet`,
      timestamp: new Date(),
      read: false,
      avatar: null
    }
    
    setNotifications(prev => [newNotification, ...prev])
    setUnreadCount(prev => prev + 1)
    toast.success('Neue Nachricht erhalten!')
  }

  const markAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
    setUnreadCount(0)
  }

  const deleteNotification = (notificationId: number) => {
    const notification = notifications.find(n => n.id === notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleNotificationClick = (notification: any) => {
    // Mark as read if not already read
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'message':
        router.push('/dashboard/chat')
        break
      case 'contact':
        router.push('/dashboard/contacts')
        break
      case 'system':
        router.push('/dashboard/settings')
        break
      default:
        router.push('/dashboard')
    }
    
    // Close notifications dropdown
    setShowNotifications(false)
    
    // Show feedback toast
    toast.success('Zur Benachrichtigung navigiert')
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬'
      case 'contact':
        return '👤'
      case 'system':
        return '⚙️'
      default:
        return '🔔'
    }
  }

  const formatNotificationTime = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    
    if (diff < 60000) return 'Gerade eben'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return timestamp.toLocaleDateString('de-DE')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Chat', href: '/dashboard/chat', icon: ChatBubbleLeftRightIcon },
    { name: 'Kontakte', href: '/dashboard/contacts', icon: UserGroupIcon },
    { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
    // { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon }, // Temporarily hidden
    { name: 'Einstellungen', href: '/dashboard/settings', icon: Cog6ToothIcon },
  ]

  const isCurrentPage = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Animated Background Gradients - Only visible in dark mode */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none hidden dark:block z-0">
        {/* Gradient Orb 1 */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent rounded-full blur-3xl animate-float"></div>

        {/* Gradient Orb 2 */}
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-pink-500/20 via-orange-500/20 to-transparent rounded-full blur-3xl animate-float" style={{ animationDelay: '-5s' }}></div>

        {/* Gradient Orb 3 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Light mode subtle pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none dark:hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50"></div>
      </div>
      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'fixed inset-0 z-50' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800 rounded-r-3xl animate-slide-in-left shadow-2xl">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full bg-gray-700/50 backdrop-blur-md border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-gray-500/50 hover:bg-gray-600/50 transition-all duration-300"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto custom-scrollbar">
            <div className="flex-shrink-0 flex items-center px-4 mb-6">
              <Logo size={40} />
              <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">Nexus Dashboard</span>
            </div>
            <nav className="mt-5 px-3 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all duration-300 ${
                    isCurrentPage(item.href)
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="mr-3 h-6 w-6" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 z-40 transition-all duration-300 ${
        sidebarCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72 xl:w-80'
      }`}>
        <div className="flex-1 flex flex-col min-h-0 bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700/50 shadow-2xl">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto custom-scrollbar">
            <div className="flex items-center flex-shrink-0 px-4 sm:px-6 mb-8 sm:mb-10">
              <Logo size={sidebarCollapsed ? 32 : 48} />
              {!sidebarCollapsed && (
                <div className="ml-3 sm:ml-4">
                  <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Nexus</span>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">Dashboard</p>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="ml-auto p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-300 hidden md:block"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarCollapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                  )}
                </svg>
              </button>
            </div>

            {/* Organization Switcher */}
            <div className="px-3 sm:px-4 py-3">
              <OrganizationSwitcher />
            </div>

            <nav className="flex-1 px-3 sm:px-4 space-y-2 sm:space-y-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium rounded-xl transition-all duration-300 relative ${
                    isCurrentPage(item.href)
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className={`${sidebarCollapsed ? 'mx-auto' : 'mr-4'} h-6 w-6 transition-all duration-300 ${
                    isCurrentPage(item.href) ? 'text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                  }`} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-semibold">{item.name}</span>
                      {isCurrentPage(item.href) && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </>
                  )}
                  {sidebarCollapsed && isCurrentPage(item.href) && (
                    <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-400 rounded-full"></div>
                  )}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700/50 p-6">
            <div className="flex-shrink-0 w-full group block">
              <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'D'}
                  </span>
                </div>
                {!sidebarCollapsed && (
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                      {user?.user_metadata?.full_name || user?.email || 'Demo User'}
                    </p>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        member?.role === 'owner' ? 'bg-purple-600/30 text-purple-300' :
                        member?.role === 'admin' ? 'bg-blue-600/30 text-blue-300' :
                        member?.role === 'member' ? 'bg-green-600/30 text-green-300' :
                        'bg-gray-600/30 text-gray-300'
                      }`}>
                        {member?.role === 'owner' ? 'Besitzer' :
                         member?.role === 'admin' ? 'Admin' :
                         member?.role === 'member' ? 'Mitglied' :
                         'Viewer'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {organization ? organization.name : 'Keine Organisation'}
                      </span>
                      {!organization && (
                        <span className="text-xs text-red-400">
                          DEBUG: Org = NULL
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 flex items-center transition-all duration-300 hover:text-red-400"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
                      Abmelden
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden relative z-50">
        <div className="bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl shadow-lg border-b border-gray-200 dark:border-gray-700/50 lg:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              type="button"
              className="p-3 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-300 hover-scale"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            {/* Notifications temporarily hidden */}
            {/* <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-3 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 relative transition-all duration-300 hover-scale"
                >
                  <BellIcon className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-6 w-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${
        sidebarCollapsed ? 'md:pl-20' : 'md:pl-64 lg:pl-72 xl:pl-80'
      }`}>
        <div className="hidden md:block relative z-50">
          <div className="bg-white/90 dark:bg-gray-800/50 backdrop-blur-xl shadow-lg border-b border-gray-200 dark:border-gray-700/50">
            <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-4 md:py-6 flex items-center justify-between">
              <div className="flex-1 flex items-center">
                <div className="max-w-xs sm:max-w-md w-full lg:max-w-sm xl:max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      className="bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 pl-10 sm:pl-12 py-3 sm:py-4 text-sm rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="Suchen..."
                      type="search"
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    
                    {/* Search Results Dropdown */}
                    {(searchTerm || searchResults.length > 0) && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[60] overflow-hidden animate-scale-in">
                        {isSearching ? (
                          <div className="p-6 text-center text-gray-400">
                            <div className="loading-dots mx-auto mb-3">
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>
                            <p className="text-sm">Suche läuft...</p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {searchResults.map((result) => (
                              <button
                                key={result.id}
                                onClick={() => handleSearchSelect(result)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-700/50 flex items-center space-x-3 transition-all duration-300"
                              >
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center ${
                                  result.type === 'contact' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-green-400 to-green-600'
                                }`}>
                                  {result.type === 'contact' ? (
                                    <UserGroupIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                  ) : (
                                    <ChatBubbleLeftRightIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-white">
                                    {result.type === 'contact' ? result.name : result.content}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {result.type === 'contact' ? result.phone : `Von ${result.contact}`}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : searchTerm && (
                          <div className="p-6 text-center text-gray-400">
                            <p className="text-sm">Keine Ergebnisse gefunden</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Notifications temporarily hidden */}
              {/* <div className="flex items-center space-x-4">
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-3 rounded-2xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 relative transition-all duration-300 hover-scale"
                  >
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-6 w-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse shadow-glow">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {/* {showNotifications && (
                    <>
                      {/* Backdrop */}
                      {/* <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setShowNotifications(false)}
                      />
                      <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] max-h-96 sm:max-h-[28rem] overflow-hidden animate-scale-in"> */}
                      {/* <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Benachrichtigungen</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                              Alle als gelesen markieren
                            </button>
                          )}
                        </div>
                      </div> */}

                      {/* <div className="max-h-80 sm:max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-all duration-300 ${
                                !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="text-2xl">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className={`text-sm font-semibold ${
                                      !notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                      {notification.title}
                                    </p>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-400">
                                        {formatNotificationTime(notification.timestamp)}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          deleteNotification(notification.id)
                                        }}
                                        className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-900/30 transition-all duration-300"
                                      >
                                        <XMarkIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {notification.message}
                                  </p>
                                  {!notification.read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        markAsRead(notification.id)
                                      }}
                                      className="text-xs text-blue-400 hover:text-blue-300 mt-2 font-medium transition-colors"
                                    >
                                      Als gelesen markieren
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center">
                            <BellIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-400">Keine Benachrichtigungen</p>
                          </div>
                        )}
                      </div>
                    </div>
                    </>
                  )}
                </div>
              </div> */}
            </div>
          </div>
        </div>

        <main className="flex-1 pb-6 sm:pb-8 relative z-10">
          <div className="px-3 sm:px-4 md:px-6 lg:px-10 py-4 sm:py-6 md:py-8">
            <div className="max-w-7xl mx-auto">
              <PageTransition>
                {children}
              </PageTransition>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}