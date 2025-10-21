'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, BarChart3, TrendingUp, Activity } from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    checkSuperAdmin()
  }, [])

  async function checkSuperAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/super-admin/analytics')
        return
      }

      const { data, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        router.push('/dashboard')
        return
      }

      setIsSuperAdmin(true)
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      router.push('/dashboard')
    }
  }

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Lädt Analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 shadow-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/super-admin')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Analytics</h1>
              <p className="text-sm text-gray-400 mt-1">Nutzungsstatistiken und Metriken</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Gesamtnutzung</p>
                <p className="text-3xl font-bold text-white">Coming Soon</p>
              </div>
              <BarChart3 className="h-12 w-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Wachstum</p>
                <p className="text-3xl font-bold text-white">Coming Soon</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Aktivität</p>
                <p className="text-3xl font-bold text-white">Coming Soon</p>
              </div>
              <Activity className="h-12 w-12 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-8 rounded-lg shadow text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Analytics Dashboard</h3>
          <p className="text-gray-400">Diese Seite wird bald mit detaillierten Statistiken erweitert.</p>
        </div>
      </div>
    </div>
  )
}
