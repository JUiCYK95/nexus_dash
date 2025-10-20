'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const responseTimeData = [
  { hour: '00:00', avgTime: 180, target: 120 },
  { hour: '02:00', avgTime: 240, target: 120 },
  { hour: '04:00', avgTime: 300, target: 120 },
  { hour: '06:00', avgTime: 90, target: 120 },
  { hour: '08:00', avgTime: 60, target: 120 },
  { hour: '10:00', avgTime: 45, target: 120 },
  { hour: '12:00', avgTime: 30, target: 120 },
  { hour: '14:00', avgTime: 35, target: 120 },
  { hour: '16:00', avgTime: 40, target: 120 },
  { hour: '18:00', avgTime: 50, target: 120 },
  { hour: '20:00', avgTime: 90, target: 120 },
  { hour: '22:00', avgTime: 120, target: 120 },
]

const responseMetrics = [
  { 
    label: 'Durchschnittliche Antwortzeit', 
    value: '2m 30s', 
    change: '-15s', 
    changeType: 'decrease',
    color: 'bg-blue-500' 
  },
  { 
    label: 'Schnellste Antwort', 
    value: '12s', 
    change: '-3s', 
    changeType: 'decrease',
    color: 'bg-green-500' 
  },
  { 
    label: 'Langsamste Antwort', 
    value: '8m 45s', 
    change: '+1m 20s', 
    changeType: 'increase',
    color: 'bg-red-500' 
  },
  { 
    label: 'Ziel-Antwortzeit', 
    value: '2m 0s', 
    change: '0s', 
    changeType: 'neutral',
    color: 'bg-gray-500' 
  },
]

export default function ResponseTimeAnalytics() {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Antwortzeit Analytics</h3>
          <p className="text-sm text-gray-500">Überwachung Ihrer Antwortzeiten</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Response Time Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {responseMetrics.map((metric) => (
            <div key={metric.label} className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${metric.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-400">{metric.label}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-bold text-white">{metric.value}</p>
                    <span className={`text-xs font-medium ${
                      metric.changeType === 'decrease' ? 'text-green-600' : 
                      metric.changeType === 'increase' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Response Time Chart */}
        <div>
          <h4 className="text-md font-medium text-white mb-4">Antwortzeit im Tagesverlauf</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => formatTime(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                    color: '#ffffff'
                  }}
                  formatter={(value: number) => [formatTime(value), 'Antwortzeit']}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgTime" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  name="Durchschnitt"
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Ziel"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-400">Durchschnittliche Antwortzeit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 border-2 border-red-500 rounded-full bg-transparent"></div>
              <span className="text-sm text-gray-400">Ziel-Antwortzeit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}