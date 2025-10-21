'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import DashboardLayout from '@/components/layout/DashboardLayout'
import EnhancedMessageChart from '@/components/dashboard/EnhancedMessageChart'
import ContactsOverview from '@/components/dashboard/ContactsOverview'
import RecentActivity from '@/components/dashboard/RecentActivity'
import QuickActions from '@/components/dashboard/QuickActions'
import AnimatedStatCard from '@/components/dashboard/AnimatedStatCard'
import SkeletonLoader from '@/components/ui/SkeletonLoader'
import ParallaxContainer from '@/components/ui/ParallaxContainer'
import { ChatBubbleLeftRightIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { fetchWithOrg } from '@/lib/api-utils'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chartPeriod, setChartPeriod] = useState(7)
  const [stats, setStats] = useState({
    totalMessages: 0,
    messagesSent: 0,
    messagesReceived: 0,
    activeContacts: 0,
    responseRate: 0,
    avgResponseTime: '0m'
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchDashboardStats()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    } else {
      setUser(user)
    }
    setLoading(false)
  }

  const fetchDashboardStats = async () => {
    try {
      // Fetch chats overview from WAHA - more efficient, includes chat info and last message
      const chatsResponse = await fetchWithOrg('/api/whatsapp/chats/overview')
      const chatsData = await chatsResponse.json()

      let totalMessages = 0
      let messagesSent = 0
      let messagesReceived = 0
      let activeContacts = 0

      // Calculate stats from chats
      if (chatsData.success && chatsData.chats) {
        activeContacts = chatsData.chats.length

        // Optimization: Fetch top 15 chats in parallel instead of sequential
        const chatsToAnalyze = chatsData.chats.slice(0, 15)

        const chatPromises = chatsToAnalyze.map(async (chat: any) => {
          try {
            const messagesResponse = await fetchWithOrg(`/api/whatsapp/chats/${chat.id}/messages?limit=100`)
            const messagesData = await messagesResponse.json()

            if (messagesData.success && messagesData.messages) {
              return messagesData.messages
            }
            return []
          } catch (error) {
            return []
          }
        })

        // Wait for all messages to load in parallel
        const results = await Promise.all(chatPromises)

        // Process all results
        for (const chatMessages of results) {
          totalMessages += chatMessages.length

          // Count sent vs received
          const sent = chatMessages.filter((msg: any) => msg.fromMe).length
          const received = chatMessages.length - sent

          messagesSent += sent
          messagesReceived += received
        }
      }

      // Calculate response rate (mock calculation for now)
      const responseRate = messagesReceived > 0
        ? Math.round((messagesSent / messagesReceived) * 100)
        : 0

      setStats({
        totalMessages,
        messagesSent,
        messagesReceived,
        activeContacts,
        responseRate: Math.min(responseRate, 100), // Cap at 100%
        avgResponseTime: '2m 30s' // TODO: Calculate from actual data
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      // Keep default values on error
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SkeletonLoader variant="stat" count={4} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SkeletonLoader variant="chart" />
            </div>
            <SkeletonLoader variant="card" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section with Animation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-white dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2"
            >
              Dashboard
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-600 dark:text-gray-400 text-lg"
            >
              Willkommen zurück, {user?.user_metadata?.full_name || user?.email}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center space-x-4"
          >
            <div className="text-right">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Heute</p>
              <p className="text-gray-900 dark:text-white text-lg font-semibold">{new Date().toLocaleDateString('de-DE')}</p>
            </div>
            <QuickActions />
          </motion.div>
        </motion.div>

        {/* Enhanced Stats Cards with Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatedStatCard
            title="Nachrichten"
            value={stats.totalMessages}
            icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
            gradient="from-blue-500 to-blue-600"
            index={0}
          />
          <AnimatedStatCard
            title="Aktive Kontakte"
            value={stats.activeContacts}
            icon={<UserGroupIcon className="w-6 h-6" />}
            gradient="from-green-500 to-emerald-600"
            index={1}
          />
          <AnimatedStatCard
            title="Antwortrate"
            value={stats.responseRate}
            icon={<ChartBarIcon className="w-6 h-6" />}
            gradient="from-purple-500 to-pink-600"
            suffix="%"
            index={2}
          />
          <AnimatedStatCard
            title="Ø Antwortzeit"
            value={parseInt(stats.avgResponseTime.replace(/\D/g, '')) || 0}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            gradient="from-orange-500 to-red-600"
            suffix="m"
            index={3}
          />
        </div>

        {/* Charts and Analytics - Bento Grid Style with Parallax */}
        <ParallaxContainer speed={0.3}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="lg:col-span-2 relative group"
            >
            {/* Gradient Glow on Hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>

            <div className="relative bg-white dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-gray-900 dark:text-white text-xl font-semibold">Nachrichten Verlauf</h3>
                <div className="flex items-center space-x-2">
                  <motion.button
                    onClick={() => setChartPeriod(7)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 ${
                      chartPeriod === 7
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    7T
                  </motion.button>
                  <motion.button
                    onClick={() => setChartPeriod(30)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 ${
                      chartPeriod === 30
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    30T
                  </motion.button>
                  <motion.button
                    onClick={() => setChartPeriod(90)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 ${
                      chartPeriod === 90
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    90T
                  </motion.button>
                </div>
              </div>
              <EnhancedMessageChart period={chartPeriod} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative group"
          >
            {/* Gradient Glow on Hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>

            <div className="relative bg-white dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-gray-900 dark:text-white text-xl font-semibold">Top Kontakte</h3>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  Alle anzeigen
                </motion.button>
              </div>
              <ContactsOverview />
            </div>
          </motion.div>
        </div>
        </ParallaxContainer>

        {/* Recent Activity with Animation and Parallax */}
        <ParallaxContainer speed={0.2}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative group"
        >
          {/* Gradient Glow on Hover */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>

          <div className="relative bg-white dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900 dark:text-white text-xl font-semibold">Letzte Aktivitäten</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium transition-colors"
              >
                Alle anzeigen
              </motion.button>
            </div>
            <RecentActivity />
          </div>
        </motion.div>
        </ParallaxContainer>
      </div>
    </DashboardLayout>
  )
}