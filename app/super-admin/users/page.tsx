'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
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
  Trash2,
  Clock,
  Send,
  RefreshCw
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
  status?: 'active' | 'pending' | 'expired'
  invitation_id?: string
  invited_by?: string
  expires_at?: string
}

export default function UsersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')

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
      await loadOrganizations()
    } catch (error) {
      console.error('Error:', error)
      router.push('/dashboard')
    }
  }

  async function loadUsers() {
    try {
      // Get all users via API route (which uses service role key)
      const response = await fetch('/api/super-admin/users')

      if (!response.ok) {
        throw new Error('Failed to load users')
      }

      const { users: loadedUsers } = await response.json()

      setUsers(loadedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Fehler beim Laden der Benutzer')
    } finally {
      setLoading(false)
    }
  }

  async function loadOrganizations() {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name')

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error loading organizations:', error)
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

  async function changeOrganization(userId: string, oldOrgId: string) {
    if (!selectedOrgId) {
      toast.error('Bitte wählen Sie eine Organisation')
      return
    }

    try {
      const response = await fetch(`/api/super-admin/users/${userId}/change-organization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newOrganizationId: selectedOrgId,
          oldOrganizationId: oldOrgId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Ändern der Organisation')
      }

      toast.success('Organisation erfolgreich geändert')
      setEditingUserId(null)
      setSelectedOrgId('')
      await loadUsers()
    } catch (error: any) {
      console.error('Error changing organization:', error)
      toast.error(error.message)
    }
  }

  async function resendInvitation(invitationId: string) {
    try {
      const response = await fetch(`/api/super-admin/invitations/${invitationId}/resend`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim erneuten Versenden')
      }

      toast.success('Einladung wurde erfolgreich erneut versendet')
      await loadUsers()
    } catch (error: any) {
      console.error('Error resending invitation:', error)
      toast.error(error.message)
    }
  }

  async function deleteUser(userId: string, userName: string) {
    if (!confirm(`Möchten Sie den Benutzer "${userName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return
    }

    try {
      const response = await fetch(`/api/super-admin/users/${userId}/delete`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Löschen des Benutzers')
      }

      toast.success('Benutzer erfolgreich gelöscht')
      await loadUsers()
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.message)
    }
  }

  async function revokeInvitation(invitationId: string, email: string) {
    if (!confirm(`Möchten Sie die Einladung für "${email}" wirklich widerrufen?`)) {
      return
    }

    try {
      const response = await fetch(`/api/super-admin/invitations/${invitationId}/delete`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Widerrufen der Einladung')
      }

      toast.success('Einladung erfolgreich widerrufen')
      await loadUsers()
    } catch (error: any) {
      console.error('Error revoking invitation:', error)
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 shadow-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-white">Benutzer</h1>
                <p className="text-sm text-gray-400 mt-1">{users.length} Benutzer gesamt</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/super-admin')}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Zurück
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Nach E-Mail, Name oder Organisation suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Benutzer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Organisation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p>Keine Benutzer gefunden</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`hover:bg-gray-900 ${
                        user.status === 'pending' ? 'bg-yellow-900/10 border-l-4 border-yellow-500' :
                        user.status === 'expired' ? 'bg-red-900/10 border-l-4 border-red-500 opacity-70' :
                        ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-white flex items-center gap-1.5 mb-1">
                            {user.status === 'pending' || user.status === 'expired' ? (
                              <Clock className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                            ) : (
                              <Users className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{user.raw_user_meta_data?.full_name || 'Kein Name'}</span>
                            {user.is_super_admin && (
                              <Shield className="h-3.5 w-3.5 text-red-500 flex-shrink-0" title="Super Admin" />
                            )}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {user.email}
                          </div>
                          {(user.created_at || user.expires_at) && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                              <span>{new Date(user.created_at).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}</span>
                              {user.expires_at && (
                                <span className="text-yellow-400">
                                  • Läuft ab: {new Date(user.expires_at).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {user.organizations.length === 0 ? (
                            <span className="text-xs text-gray-500">Keine Organisation</span>
                          ) : (
                            user.organizations.map((org, idx) => (
                              <div key={idx} className="mb-1 last:mb-0">
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-white truncate">{org.org_name}</span>
                                </div>
                                <div className="text-xs text-gray-400 ml-4.5">
                                  {org.role}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            <Clock className="h-3 w-3" />
                            Ausstehend
                          </span>
                        ) : user.status === 'expired' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                            <XCircle className="h-3 w-3" />
                            Abgelaufen
                          </span>
                        ) : user.email_confirmed_at ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                            <XCircle className="h-3 w-3" />
                            Unbestätigt
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {(user.status === 'pending' || user.status === 'expired') && user.invitation_id ? (
                            <>
                              <button
                                onClick={() => resendInvitation(user.invitation_id!)}
                                className="p-1.5 rounded text-purple-400 hover:bg-purple-500/20 border border-purple-500/30"
                                title="Einladung erneut versenden"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => revokeInvitation(user.invitation_id!, user.email)}
                                className="p-1.5 rounded text-red-400 hover:bg-red-500/20 border border-red-500/30"
                                title="Einladung widerrufen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => toggleSuperAdmin(user.id, user.is_super_admin)}
                                className={`p-1.5 rounded border ${
                                  user.is_super_admin
                                    ? 'text-red-400 hover:bg-red-500/20 border-red-500/30'
                                    : 'text-blue-400 hover:bg-blue-500/20 border-blue-500/30'
                                }`}
                                title={user.is_super_admin ? 'Super Admin entfernen' : 'Zu Super Admin machen'}
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteUser(user.id, user.raw_user_meta_data?.full_name || user.email)}
                                className="p-1.5 rounded text-red-400 hover:bg-red-500/20 border border-red-500/30"
                                title="Benutzer löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
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
