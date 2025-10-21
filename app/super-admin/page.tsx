'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Users,
  Building2,
  TrendingUp,
  Activity,
  DollarSign,
  UserCheck,
  AlertCircle,
  BarChart3,
  Settings,
  Shield
} from 'lucide-react'

interface DashboardStats {
  total_organizations: number
  active_organizations: number
  trial_organizations: number
  total_users: number
  active_users: number
  total_memberships: number
  monthly_messages: number
  super_admin_count: number
}

export default function SuperAdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    checkSuperAdmin()
  }, [])

  async function checkSuperAdmin() {
    try {
      console.log('🔍 Checking super admin status...')

      // First check if we have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Session check:', { hasSession: !!session, error: sessionError })

      if (sessionError || !session) {
        console.error('❌ No session found, redirecting to login')
        router.push('/login?redirect=/super-admin')
        return
      }

      // Now get the user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User:', user?.email, 'Error:', userError)

      if (userError || !user) {
        console.error('❌ No user found, redirecting to login')
        router.push('/login?redirect=/super-admin')
        return
      }

      console.log('✅ User authenticated:', user.email)

      // Check if user is super admin
      const { data, error } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      console.log('Super admin query result:', { data, error })

      if (error || !data) {
        console.error('❌ Not a super admin:', error?.message)
        alert(`Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen.\n\nUser: ${user.email}\nError: ${error?.message || 'No data found'}`)
        router.push('/dashboard')
        return
      }

      console.log('✅ Super admin verified!')
      setIsSuperAdmin(true)
      await loadStats()
    } catch (error) {
      console.error('Error checking super admin status:', error)
      router.push('/dashboard')
    }
  }

  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('super_admin_dashboard_stats')
        .select('*')
        .single()

      if (error) throw error
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Lädt Super Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      name: 'Organisationen Gesamt',
      value: stats?.total_organizations || 0,
      icon: Building2,
      color: 'bg-blue-500',
      href: '/super-admin/organizations'
    },
    {
      name: 'Aktive Organisationen',
      value: stats?.active_organizations || 0,
      icon: Activity,
      color: 'bg-green-500',
      href: '/super-admin/organizations?filter=active'
    },
    {
      name: 'Trial Organisationen',
      value: stats?.trial_organizations || 0,
      icon: AlertCircle,
      color: 'bg-yellow-500',
      href: '/super-admin/organizations?filter=trial'
    },
    {
      name: 'Benutzer Gesamt',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'bg-purple-500',
      href: '/super-admin/users'
    },
    {
      name: 'Aktive Benutzer',
      value: stats?.active_users || 0,
      icon: UserCheck,
      color: 'bg-indigo-500',
      href: '/super-admin/users?filter=active'
    },
    {
      name: 'Mitgliedschaften',
      value: stats?.total_memberships || 0,
      icon: TrendingUp,
      color: 'bg-pink-500',
      href: '/super-admin/memberships'
    },
    {
      name: 'Nachrichten/Monat',
      value: stats?.monthly_messages || 0,
      icon: BarChart3,
      color: 'bg-orange-500',
      href: '/super-admin/analytics'
    },
    {
      name: 'Super Admins',
      value: stats?.super_admin_count || 0,
      icon: Shield,
      color: 'bg-red-500',
      href: '/super-admin/admins'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 shadow-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-500" />
              <div>
                <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
                <p className="text-sm text-gray-400 mt-1">Systemverwaltung und Übersicht</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Zurück zum Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.name}
                onClick={() => router.push(stat.href)}
                className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg hover:shadow-xl hover:border-gray-600 transition-all cursor-pointer overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                      <p className="text-3xl font-bold text-white mt-2">{stat.value.toLocaleString()}</p>
                    </div>
                    <div className={`${stat.color} rounded-full p-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900 px-6 py-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400">Zum Verwalten klicken</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Management Links */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Verwaltung</h2>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => router.push('/super-admin/organizations')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
              >
                <Building2 className="h-5 w-5" />
                <span className="font-medium">Organisationen verwalten</span>
              </button>
              <button
                onClick={() => router.push('/super-admin/users')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors"
              >
                <Users className="h-5 w-5" />
                <span className="font-medium">Benutzer verwalten</span>
              </button>
              <button
                onClick={() => router.push('/super-admin/subscriptions')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-colors"
              >
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Abonnements verwalten</span>
              </button>
              <button
                onClick={() => router.push('/super-admin/settings')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">System-Einstellungen</span>
              </button>
            </div>
          </div>

          {/* Analytics Links */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">Analytics & Berichte</h2>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => router.push('/super-admin/analytics')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-lg transition-colors"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="font-medium">Nutzungsstatistiken</span>
              </button>
              <button
                onClick={() => router.push('/super-admin/revenue')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg transition-colors"
              >
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Umsatz-Übersicht</span>
              </button>
              <button
                onClick={() => router.push('/super-admin/activity')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
              >
                <Activity className="h-5 w-5" />
                <span className="font-medium">Aktivitätslogs</span>
              </button>
              <button
                onClick={() => router.push('/super-admin/logs')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
              >
                <Shield className="h-5 w-5" />
                <span className="font-medium">Audit Logs</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
