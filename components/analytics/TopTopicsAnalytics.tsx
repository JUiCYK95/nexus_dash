'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

const topTopics = [
  { name: 'Terminbuchung', value: 28, count: 245, color: '#22c55e' },
  { name: 'Servicepreis-Anfragen', value: 22, count: 192, color: '#3b82f6' },
  { name: 'Ersatzteil-Verfügbarkeit', value: 18, count: 158, color: '#f59e0b' },
  { name: 'Garantie & Gewährleistung', value: 15, count: 131, color: '#8b5cf6' },
  { name: 'Fahrzeugverkauf', value: 12, count: 105, color: '#ef4444' },
  { name: 'Probefahrt-Anfragen', value: 5, count: 44, color: '#06b6d4' },
]

const monthlyTopics = [
  { month: 'Jan', termine: 45, service: 38, ersatzteile: 32, garantie: 28 },
  { month: 'Feb', termine: 52, service: 41, ersatzteile: 35, garantie: 30 },
  { month: 'Mar', termine: 48, service: 44, ersatzteile: 38, garantie: 32 },
  { month: 'Apr', termine: 55, service: 39, ersatzteile: 31, garantie: 29 },
  { month: 'Mai', termine: 61, service: 46, ersatzteile: 42, garantie: 35 },
  { month: 'Jun', termine: 58, service: 48, ersatzteile: 40, garantie: 33 },
]

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

export default function TopTopicsAnalytics() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Chat-Themen</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Häufigste Kundenanfragen im Autohaus</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Current Period Topics Distribution */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4 dark:text-gray-100">Themenverteilung (letzten 30 Tage)</h4>
          <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-8">
            <div className="h-64 w-64 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topTopics}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {topTopics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, name]}
                    labelFormatter={() => ''}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 space-y-3">
              {topTopics.map((topic, index) => (
                <div key={topic.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: topic.color }}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{topic.name}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{topic.count} Nachrichten</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{topic.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Topics Trend */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4 dark:text-gray-100">Themen-Trends (6 Monate)</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTopics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar dataKey="termine" fill="#22c55e" name="Termine" radius={[2, 2, 0, 0]} />
                <Bar dataKey="service" fill="#3b82f6" name="Service" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ersatzteile" fill="#f59e0b" name="Ersatzteile" radius={[2, 2, 0, 0]} />
                <Bar dataKey="garantie" fill="#8b5cf6" name="Garantie" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 dark:bg-green-900/20 dark:border-green-700/50">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📅</span>
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-300">Meistgefragtes Thema</p>
                <p className="text-xs text-green-700 dark:text-green-400">Terminbuchungen (+8% vs. Vormonat)</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/50">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💰</span>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Umsatzrelevant</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">67% der Anfragen führen zu Buchungen</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 dark:bg-purple-900/20 dark:border-purple-700/50">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Schnellste Antwort</p>
                <p className="text-xs text-purple-700 dark:text-purple-400">Ø 3 Min bei Terminanfragen</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}