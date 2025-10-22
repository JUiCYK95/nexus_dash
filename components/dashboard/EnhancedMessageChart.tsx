'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchWithOrg } from '@/lib/api-utils'

interface EnhancedMessageChartProps {
  period?: number
}

export default function EnhancedMessageChart({ period = 7 }: EnhancedMessageChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessageData(period)
  }, [period])

  const fetchMessageData = async (days: number) => {
    setLoading(true)
    try {
      const response = await fetchWithOrg('/api/whatsapp/chats/overview')
      const chatsData = await response.json()

      if (chatsData.success && chatsData.chats) {
        const chartData = []
        const now = new Date()

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          date.setHours(0, 0, 0, 0)

          let dayName = ''
          if (days === 7) {
            dayName = date.toLocaleDateString('de-DE', { weekday: 'short' })
          } else {
            dayName = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
          }

          chartData.push({
            name: dayName,
            date: date.getTime(),
            sent: 0,
            received: 0
          })
        }

        const messageFetches = chatsData.chats.slice(0, 10).map(async (chat: any) => {
          try {
            const messagesResponse = await fetch(`/api/whatsapp/chats/${chat.id}/messages?limit=100`)
            const messagesData = await messagesResponse.json()
            if (messagesData.success && messagesData.messages) {
              return messagesData.messages
            }
            return []
          } catch (error) {
            return []
          }
        })

        const allMessagesArrays = await Promise.all(messageFetches)
        const allMessages = allMessagesArrays.flat()

        allMessages.forEach((msg: any) => {
          if (!msg.timestamp) return
          const msgDate = typeof msg.timestamp === 'number'
            ? new Date(msg.timestamp * 1000)
            : new Date(msg.timestamp)
          msgDate.setHours(0, 0, 0, 0)
          const msgTime = msgDate.getTime()
          const dayData = chartData.find(d => d.date === msgTime)
          if (dayData) {
            if (msg.fromMe) {
              dayData.sent++
            } else {
              dayData.received++
            }
          }
        })

        setData(chartData)
      }
    } catch (error) {
      console.error('Error fetching message data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glassmorphism rounded-xl p-4 border border-white/30 dark:border-gray-700/50"
        >
          <p className="text-gray-900 dark:text-white font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Gesendet: <span className="font-semibold text-green-600 dark:text-green-400">{payload[0].value}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-500"></div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Empfangen: <span className="font-semibold text-blue-600 dark:text-blue-400">{payload[1].value}</span>
              </p>
            </div>
          </div>
        </motion.div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Daten werden geladen...</p>
        </motion.div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Keine Daten verfügbar</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="h-80"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sentGradientEnhanced" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="receivedGradientEnhanced" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            opacity={0.3}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="sent"
            stroke="#22c55e"
            strokeWidth={3}
            fill="url(#sentGradientEnhanced)"
            name="Gesendet"
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
          <Area
            type="monotone"
            dataKey="received"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#receivedGradientEnhanced)"
            name="Empfangen"
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
