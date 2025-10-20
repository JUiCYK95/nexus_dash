'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const peakHoursData = [
  { hour: '00:00', messages: 12, percentage: 2 },
  { hour: '01:00', messages: 8, percentage: 1 },
  { hour: '02:00', messages: 5, percentage: 1 },
  { hour: '03:00', messages: 3, percentage: 0.5 },
  { hour: '04:00', messages: 2, percentage: 0.3 },
  { hour: '05:00', messages: 4, percentage: 0.7 },
  { hour: '06:00', messages: 15, percentage: 3 },
  { hour: '07:00', messages: 35, percentage: 6 },
  { hour: '08:00', messages: 58, percentage: 10 },
  { hour: '09:00', messages: 72, percentage: 12 },
  { hour: '10:00', messages: 85, percentage: 14 },
  { hour: '11:00', messages: 78, percentage: 13 },
  { hour: '12:00', messages: 65, percentage: 11 },
  { hour: '13:00', messages: 55, percentage: 9 },
  { hour: '14:00', messages: 68, percentage: 11 },
  { hour: '15:00', messages: 75, percentage: 13 },
  { hour: '16:00', messages: 82, percentage: 14 },
  { hour: '17:00', messages: 89, percentage: 15 },
  { hour: '18:00', messages: 92, percentage: 16 },
  { hour: '19:00', messages: 78, percentage: 13 },
  { hour: '20:00', messages: 65, percentage: 11 },
  { hour: '21:00', messages: 48, percentage: 8 },
  { hour: '22:00', messages: 32, percentage: 5 },
  { hour: '23:00', messages: 25, percentage: 4 },
]

const dayOfWeekData = [
  { day: 'Montag', messages: 142, percentage: 18 },
  { day: 'Dienstag', messages: 158, percentage: 20 },
  { day: 'Mittwoch', messages: 165, percentage: 21 },
  { day: 'Donnerstag', messages: 145, percentage: 18 },
  { day: 'Freitag', messages: 128, percentage: 16 },
  { day: 'Samstag', messages: 89, percentage: 11 },
  { day: 'Sonntag', messages: 73, percentage: 9 },
]

export default function PeakHoursChart() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Stoßzeiten Analytics</h3>
          <p className="text-sm text-gray-500">Wann sind Ihre Nutzer am aktivsten?</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Peak Hours by Time of Day */}
        <div>
          <h4 className="text-md font-medium text-white mb-4">Nachrichten nach Tageszeit</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10 }}
                  interval={2}
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
                  formatter={(value: number) => [value, 'Nachrichten']}
                />
                <Bar 
                  dataKey="messages" 
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]}
                  name="Nachrichten"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours by Day of Week */}
        <div>
          <h4 className="text-md font-medium text-white mb-4">Nachrichten nach Wochentag</h4>
          <div className="space-y-3">
            {dayOfWeekData.map((day) => (
              <div key={day.day} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-20 text-sm font-medium text-white">{day.day}</div>
                  <div className="flex-1 bg-gray-700/50 rounded-full h-3 w-32">
                    <div 
                      className="bg-whatsapp-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${day.percentage * 4}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white">{day.messages}</span>
                  <span className="text-xs text-gray-500">({day.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-whatsapp-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-whatsapp-700">Stärkste Stunde</p>
            <p className="text-2xl font-bold text-whatsapp-900">18:00</p>
            <p className="text-xs text-whatsapp-600">92 Nachrichten</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-blue-700">Stärkster Tag</p>
            <p className="text-2xl font-bold text-blue-900">Mittwoch</p>
            <p className="text-xs text-blue-600">165 Nachrichten</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-purple-700">Aktivitätsrate</p>
            <p className="text-2xl font-bold text-purple-900">87%</p>
            <p className="text-xs text-purple-600">Werktags</p>
          </div>
        </div>
      </div>
    </div>
  )
}