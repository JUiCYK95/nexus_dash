'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const monthlyData = [
  { month: 'Jan', sent: 120, received: 145 },
  { month: 'Feb', sent: 135, received: 158 },
  { month: 'Mar', sent: 150, received: 172 },
  { month: 'Apr', sent: 142, received: 165 },
  { month: 'Mai', sent: 165, received: 188 },
  { month: 'Jun', sent: 180, received: 205 },
  { month: 'Jul', sent: 195, received: 220 },
]

const messageTypes = [
  { name: 'Text', value: 60, color: '#22c55e' },
  { name: 'Bilder', value: 18, color: '#3b82f6' },
  { name: 'Videos', value: 8, color: '#f59e0b' },
  { name: 'Audio', value: 9, color: '#8b5cf6' },
  { name: 'Dokumente', value: 5, color: '#ef4444' },
]

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444']

export default function MessageAnalytics() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Nachrichten Analytics</h3>
          <p className="text-sm text-gray-500">Detaillierte Aufschlüsselung Ihrer Nachrichten</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Monthly Messages Chart */}
        <div>
          <h4 className="text-md font-medium text-white mb-4">Monatliche Nachrichtenverteilung</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
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
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                    color: '#ffffff'
                  }}
                />
                <Bar dataKey="sent" fill="#22c55e" name="Gesendet" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" fill="#3b82f6" name="Empfangen" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Message Types Distribution */}
        <div>
          <h4 className="text-md font-medium text-white mb-4">Nachrichtentypen Verteilung</h4>
          <div className="flex items-center space-x-8">
            <div className="h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={messageTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {messageTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {messageTypes.map((type, index) => (
                <div key={type.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm font-medium text-white">{type.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{type.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}