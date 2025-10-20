'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface MessageChartProps {
  period?: number
}

export default function MessageChart({ period = 7 }: MessageChartProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessageData(period)
  }, [period])

  const fetchMessageData = async (days: number) => {
    setLoading(true)
    try {
      // Fetch chats overview from WAHA - more efficient than fetching all chats
      const response = await fetch('/api/whatsapp/chats/overview')
      const chatsData = await response.json()

      if (chatsData.success && chatsData.chats) {
        // Create data for the selected period
        const chartData = []
        const now = new Date()

        // Initialize data structure for each day
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          date.setHours(0, 0, 0, 0)

          // Format date label based on period
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

        // Fetch messages from recent chats and categorize by day
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

        // Categorize messages by day
        allMessages.forEach((msg: any) => {
          if (!msg.timestamp) return

          // WAHA timestamps could be Unix seconds or ISO strings
          const msgDate = typeof msg.timestamp === 'number'
            ? new Date(msg.timestamp * 1000) // If it's Unix seconds, multiply by 1000
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

        console.log('📊 Message Chart Data:', {
          totalMessages: allMessages.length,
          chartData,
          sampleMessage: allMessages[0]
        })

        setData(chartData)
      }
    } catch (error) {
      console.error('Error fetching message data:', error)
      // Set empty data on error
      setData([])
    } finally {
      setLoading(false)
    }
  }
  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Daten werden geladen...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Keine Daten verfügbar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="receivedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
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
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #374151',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: '#ffffff'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="sent" 
            stroke="#22c55e" 
            strokeWidth={2}
            fill="url(#sentGradient)"
            name="Gesendet"
          />
          <Area 
            type="monotone" 
            dataKey="received" 
            stroke="#3b82f6" 
            strokeWidth={2}
            fill="url(#receivedGradient)"
            name="Empfangen"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}