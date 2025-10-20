'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  Users,
  Search,
  Mail,
  Calendar,
  Shield,
  Building2,
  CheckCircle,
  XCircle,
  Edit,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  raw_user_meta_data: any
  organizations: Array<{
    org_id: string
    org_name: string
    role: string
    is_active: boolean
  }>
  is_super_admin: boolean
}

export default function UsersPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    checkSuperAdmin()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm])

  async function checkSuperAdmin() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
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

      await loadUsers()
    } catch (error) {
      console.error('Error:', error)
      router.push('/dashboard')
    }
  }

  async function loadUsers() {
    try {
      // Get all users from auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) throw authError

      // Get organization memberships
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          is_active,
          organization_id,
          organizations (
            id,
            name
          )
        `)

      if (memberError) throw memberError

      // Get super admins
      const { data: superAdmins, error: superError } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('is_active', true)

      if (superError) throw superError

      const superAdminIds = new Set(superAdmins?.map(sa => sa.user_id) || [])

      // Combine data
      const combinedUsers = authUsers.users.map(user => {
        const userMemberships = memberships?.filter(m => m.user_id === user.id) || []
        return {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          email_confirmed_at: user.email_confirmed_at,
          raw_user_meta_data: user.user_metadata,
          organizations: userMemberships.map(m => ({
            org_id: m.organization_id,
            org_name: (m.organizations as any)?.name || 'Unknown',
            role: m.role,
            is_active: m.is_active
          })),
          is_super_admin: superAdminIds.has(user.id)
        }
      })

      setUsers(combinedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Fehler beim Laden der Benutzer')
    } finally {
      setLoading(false)
    }
  }

  function filterUsers() {
    let filtered = [...users]

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.raw_user_meta_data?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.organizations.some(org => org.org_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredUsers(filtered)
  }

  async function toggleSuperAdmin(userId: string, currentlySuper: boolean) {
    try {
      if (currentlySuper) {
        // Remove super admin
        const { error } = await supabase
          .from('super_admins')
          .delete()
          .eq('user_id', userId)

        if (error) throw error
        toast.success('Super Admin Zugriff entfernt')
      } else {
        // Add super admin
        const { error } = await supabase
          .from('super_admins')
          .insert({ user_id: userId })

        if (error) throw error
        toast.success('Super Admin Zugriff gewährt')
      }

      await loadUsers()
    } catch (error: any) {
      console.error('Error toggling super admin:', error)
      toast.error('Fehler: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Benutzer</h1>
                <p className="text-sm text-gray-600 mt-1">{users.length} Benutzer gesamt</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/super-admin')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Zurück
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Nach E-Mail, Name oder Organisation suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Benutzer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organisationen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Letzter Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p>Keine Benutzer gefunden</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {user.raw_user_meta_data?.full_name || 'Kein Name'}
                              {user.is_super_admin && (
                                <Shield className="h-4 w-4 text-red-500" title="Super Admin" />
                              )}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {user.organizations.length === 0 ? (
                            <span className="text-sm text-gray-400">Keine Organisationen</span>
                          ) : (
                            user.organizations.map((org, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-gray-400" />
                                  <span className="text-gray-900">{org.org_name}</span>
                                  <span className="text-xs text-gray-500">({org.role})</span>
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.email_confirmed_at ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3" />
                            Bestätigt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <XCircle className="h-3 w-3" />
                            Unbestätigt
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(user.created_at).toLocaleDateString('de-DE')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString('de-DE')
                          : 'Nie'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleSuperAdmin(user.id, user.is_super_admin)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            user.is_super_admin
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                          title={user.is_super_admin ? 'Super Admin entfernen' : 'Zu Super Admin machen'}
                        >
                          {user.is_super_admin ? 'Admin entfernen' : 'Admin machen'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
