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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Benutzer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Organisationen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Letzter Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                            user.status === 'pending' || user.status === 'expired'
                              ? 'bg-yellow-500/20'
                              : 'bg-purple-100'
                          }`}>
                            {user.status === 'pending' || user.status === 'expired' ? (
                              <Clock className="h-5 w-5 text-yellow-400" />
                            ) : (
                              <Users className="h-5 w-5 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white flex items-center gap-2">
                              {user.raw_user_meta_data?.full_name || 'Kein Name'}
                              {user.is_super_admin && (
                                <Shield className="h-4 w-4 text-red-500" title="Super Admin" />
                              )}
                              {user.status === 'pending' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
                                  Ausstehend
                                </span>
                              )}
                              {user.status === 'expired' && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/50">
                                  Abgelaufen
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {editingUserId === user.id && user.organizations[0] ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedOrgId}
                              onChange={(e) => setSelectedOrgId(e.target.value)}
                              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                            >
                              <option value="">Organisation wählen...</option>
                              {organizations.map(org => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => changeOrganization(user.id, user.organizations[0].org_id)}
                              className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() => {
                                setEditingUserId(null)
                                setSelectedOrgId('')
                              }}
                              className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs hover:bg-gray-500/30"
                            >
                              Abbrechen
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {user.organizations.length === 0 ? (
                              <span className="text-sm text-gray-400">Keine Organisationen</span>
                            ) : (
                              user.organizations.map((org, idx) => (
                                <div key={idx} className="text-sm flex items-center gap-2">
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-gray-400" />
                                    <span className="text-white">{org.org_name}</span>
                                    <span className="text-xs text-gray-400">({org.role})</span>
                                  </span>
                                  {user.status === 'active' && (
                                    <button
                                      onClick={() => {
                                        setEditingUserId(user.id)
                                        setSelectedOrgId(org.org_id)
                                      }}
                                      className="text-blue-400 hover:text-blue-300"
                                      title="Organisation ändern"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            <Clock className="h-3 w-3" />
                            Einladung ausstehend
                          </span>
                        ) : user.status === 'expired' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                            <XCircle className="h-3 w-3" />
                            Abgelaufen
                          </span>
                        ) : user.email_confirmed_at ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Bestätigt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                            <XCircle className="h-3 w-3" />
                            Unbestätigt
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(user.created_at).toLocaleDateString('de-DE')}
                        </div>
                        {user.expires_at && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Clock className="h-3 w-3" />
                            Läuft ab: {new Date(user.expires_at).toLocaleDateString('de-DE')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString('de-DE')
                          : 'Nie'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {(user.status === 'pending' || user.status === 'expired') && user.invitation_id ? (
                            <button
                              onClick={() => resendInvitation(user.invitation_id!)}
                              className="px-3 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 inline-flex items-center gap-1"
                              title="Einladung erneut versenden"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Erneut senden
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleSuperAdmin(user.id, user.is_super_admin)}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                user.is_super_admin
                                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                              }`}
                              title={user.is_super_admin ? 'Super Admin entfernen' : 'Zu Super Admin machen'}
                            >
                              {user.is_super_admin ? 'Admin entfernen' : 'Admin machen'}
                            </button>
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
