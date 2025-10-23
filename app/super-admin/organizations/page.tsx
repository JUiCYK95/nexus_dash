'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Filter,
  Send
} from 'lucide-react'
import { toast } from 'sonner'

interface Organization {
  id: string
  name: string
  slug: string
  subscription_plan: string
  subscription_status: string
  stripe_customer_id: string | null
  trial_ends_at: string | null
  billing_email: string | null
  created_at: string
  updated_at: string
  member_count: number
  owner_email: string | null
}

export default function OrganizationsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [resendingInvite, setResendingInvite] = useState(false)
  const [assigningOwner, setAssigningOwner] = useState(false)
  const [showOwnerInput, setShowOwnerInput] = useState(false)
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [allUsers, setAllUsers] = useState<Array<{ id: string; email: string; name: string }>>([])
  const [formData, setFormData] = useState({
    name: '',
    subscription_plan: 'starter',
    subscription_status: 'trialing',
    owner_email: '',
    waha_api_url: '',
    waha_api_key: ''
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    subscription_plan: 'starter',
    subscription_status: 'trialing',
    billing_email: '',
    waha_api_url: '',
    waha_api_key: ''
  })

  useEffect(() => {
    checkSuperAdmin()
    loadAllUsers()
  }, [])

  useEffect(() => {
    filterOrganizations()
  }, [organizations, searchTerm, filterStatus])

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

      await loadOrganizations()
    } catch (error) {
      console.error('Error:', error)
      router.push('/dashboard')
    }
  }

  async function loadOrganizations() {
    try {
      const { data, error } = await supabase
        .from('super_admin_organizations_overview')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error loading organizations:', error)
      toast.error('Fehler beim Laden der Organisationen')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllUsers() {
    try {
      const response = await fetch('/api/super-admin/users')
      if (!response.ok) return

      const { users } = await response.json()
      const formattedUsers = users
        .filter((u: any) => u.status === 'active' && u.email_confirmed_at)
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.raw_user_meta_data?.full_name || u.email
        }))

      setAllUsers(formattedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  function filterOrganizations() {
    let filtered = [...organizations]

    if (searchTerm) {
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(org => org.subscription_status === filterStatus)
    }

    setFilteredOrgs(filtered)
  }

  async function deleteOrganization(orgId: string, orgName: string) {
    if (!confirm(`Möchten Sie die Organisation "${orgName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId)

      if (error) throw error

      toast.success('Organisation erfolgreich gelöscht')
      await loadOrganizations()
    } catch (error: any) {
      console.error('Error deleting organization:', error)
      toast.error('Fehler beim Löschen: ' + error.message)
    }
  }

  async function createOrganization() {
    if (!formData.name) {
      toast.error('Name ist erforderlich')
      return
    }

    if (!formData.owner_email) {
      toast.error('Owner E-Mail ist erforderlich')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.owner_email)) {
      toast.error('Bitte geben Sie eine gültige E-Mail-Adresse ein')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/super-admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der Organisation')
      }

      if (data.invitation_sent) {
        toast.success('Organisation erstellt und Einladung versendet')
      } else {
        toast.success('Organisation erfolgreich erstellt')
      }

      setShowCreateModal(false)
      setFormData({
        name: '',
        subscription_plan: 'starter',
        subscription_status: 'trialing',
        owner_email: '',
        waha_api_url: '',
        waha_api_key: ''
      })
      await loadOrganizations()
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast.error(error.message)
    } finally {
      setCreating(false)
    }
  }

  function openEditModal(org: Organization) {
    setEditingOrg(org)
    setEditFormData({
      name: org.name,
      subscription_plan: org.subscription_plan,
      subscription_status: org.subscription_status,
      billing_email: org.billing_email || '',
      waha_api_url: '',
      waha_api_key: ''
    })
  }

  async function updateOrganization() {
    if (!editingOrg) return

    if (!editFormData.name) {
      toast.error('Name ist erforderlich')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/super-admin/organizations/${editingOrg.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Aktualisieren der Organisation')
      }

      toast.success('Organisation erfolgreich aktualisiert')
      setEditingOrg(null)
      setEditFormData({
        name: '',
        subscription_plan: 'starter',
        subscription_status: 'trialing',
        billing_email: '',
        waha_api_url: '',
        waha_api_key: ''
      })
      await loadOrganizations()
    } catch (error: any) {
      console.error('Error updating organization:', error)
      toast.error(error.message)
    } finally {
      setUpdating(false)
    }
  }

  async function resendOwnerInvitation(orgId: string) {
    setResendingInvite(true)
    try {
      const response = await fetch(`/api/super-admin/organizations/${orgId}/resend-owner-invitation`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim erneuten Versenden der Einladung')
      }

      toast.success('Einladung an den Besitzer wurde erfolgreich versendet')
    } catch (error: any) {
      console.error('Error resending owner invitation:', error)
      toast.error(error.message)
    } finally {
      setResendingInvite(false)
    }
  }

  async function assignOwner(orgId: string, userIdOrEmail: string) {
    setAssigningOwner(true)
    try {
      const isEmail = userIdOrEmail.includes('@')
      const payload = isEmail
        ? { ownerEmail: userIdOrEmail }
        : { userId: userIdOrEmail }

      const response = await fetch(`/api/super-admin/organizations/${orgId}/assign-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Zuweisen des Besitzers')
      }

      if (data.invited) {
        toast.success('Einladung wurde an die E-Mail-Adresse versendet')
      } else {
        toast.success('Besitzer erfolgreich zugewiesen')
      }

      setShowOwnerInput(false)
      setNewOwnerEmail('')
      await loadOrganizations()
    } catch (error: any) {
      console.error('Error assigning owner:', error)
      toast.error(error.message)
    } finally {
      setAssigningOwner(false)
    }
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      active: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle, text: 'Aktiv' },
      trialing: { color: 'bg-blue-500/20 text-blue-400', icon: Clock, text: 'Testphase' },
      canceled: { color: 'bg-red-500/20 text-red-400', icon: XCircle, text: 'Gekündigt' },
      past_due: { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock, text: 'Überfällig' },
    }

    const badge = badges[status] || badges.active
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        {badge.text}
      </span>
    )
  }

  function getPlanBadge(plan: string) {
    const colors: Record<string, string> = {
      starter: 'bg-gray-700 text-gray-200',
      professional: 'bg-purple-500/20 text-purple-400',
      business: 'bg-blue-500/20 text-blue-400',
      enterprise: 'bg-orange-100 text-orange-800',
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[plan] || colors.starter}`}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </span>
    )
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
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-white">Organisationen</h1>
                <p className="text-sm text-gray-400 mt-1">{organizations.length} Organisationen gesamt</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/super-admin')}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Zurück
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Neue Organisation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nach Name, Slug oder E-Mail suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alle Status</option>
                <option value="active">Aktiv</option>
                <option value="trialing">Testphase</option>
                <option value="canceled">Gekündigt</option>
                <option value="past_due">Überfällig</option>
              </select>
            </div>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Mitglieder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-200">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p>Keine Organisationen gefunden</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-900">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">{org.name}</div>
                          <div className="text-sm text-gray-400">/{org.slug}</div>
                          {org.owner_email && (
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3" />
                              {org.owner_email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPlanBadge(org.subscription_plan)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(org.subscription_status)}
                        {org.trial_ends_at && org.subscription_status === 'trialing' && (
                          <div className="text-xs text-gray-400 mt-1">
                            Endet: {new Date(org.trial_ends_at).toLocaleDateString('de-DE')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-white">
                          <Users className="h-4 w-4 text-gray-400" />
                          {org.member_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {new Date(org.created_at).toLocaleDateString('de-DE')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(org.created_at).toLocaleTimeString('de-DE')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(org)}
                          className="text-blue-400 hover:text-blue-300 mr-3"
                          title="Bearbeiten"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteOrganization(org.id, org.name)}
                          className="text-red-400 hover:text-red-300"
                          title="Löschen"
                        >
                          <Trash2 className="h-5 w-5" />
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Neue Organisation erstellen</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organisationsname *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. Meine Organisation"
                />
              </div>

              {/* Owner Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Owner E-Mail *
                </label>
                <input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. owner@example.com"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Wenn der Benutzer nicht existiert, wird automatisch eine Einladung versendet
                </p>
              </div>

              {/* WAHA API URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  WAHA API URL
                </label>
                <input
                  type="url"
                  value={formData.waha_api_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, waha_api_url: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://waha.devlike.pro"
                />
              </div>

              {/* WAHA API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  WAHA API Key
                </label>
                <input
                  type="text"
                  value={formData.waha_api_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, waha_api_key: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="API Key für WAHA"
                />
              </div>

              {/* Subscription Plan */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subscription Plan
                </label>
                <select
                  value={formData.subscription_plan}
                  onChange={(e) => setFormData(prev => ({ ...prev, subscription_plan: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Subscription Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subscription Status
                </label>
                <select
                  value={formData.subscription_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, subscription_status: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="trialing">Testphase (14 Tage)</option>
                  <option value="active">Aktiv</option>
                  <option value="canceled">Gekündigt</option>
                  <option value="past_due">Überfällig</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                disabled={creating}
              >
                Abbrechen
              </button>
              <button
                onClick={createOrganization}
                disabled={creating || !formData.name || !formData.owner_email}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Erstellen...' : 'Organisation erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Organisation bearbeiten</h2>
              <button
                onClick={() => setEditingOrg(null)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organisationsname *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Billing Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rechnungs-E-Mail
                </label>
                <input
                  type="email"
                  value={editFormData.billing_email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, billing_email: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. billing@example.com"
                />
              </div>

              {/* WAHA API URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  WAHA API URL
                </label>
                <input
                  type="url"
                  value={editFormData.waha_api_url}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, waha_api_url: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://waha.devlike.pro"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leer lassen, um die aktuelle URL zu behalten
                </p>
              </div>

              {/* WAHA API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  WAHA API Key
                </label>
                <input
                  type="text"
                  value={editFormData.waha_api_key}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, waha_api_key: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="API Key für WAHA"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leer lassen, um den aktuellen Key zu behalten
                </p>
              </div>

              {/* Subscription Plan */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subscription Plan
                </label>
                <select
                  value={editFormData.subscription_plan}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, subscription_plan: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Subscription Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subscription Status
                </label>
                <select
                  value={editFormData.subscription_status}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, subscription_status: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="trialing">Testphase</option>
                  <option value="active">Aktiv</option>
                  <option value="canceled">Gekündigt</option>
                  <option value="past_due">Überfällig</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 mt-6 pt-6 border-t border-gray-700">
              {editingOrg && (
                <div className="p-3 bg-gray-700/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white font-medium">Besitzer</div>
                      <div className="text-xs text-gray-400">
                        {editingOrg.owner_email || 'Kein Besitzer zugeordnet'}
                      </div>
                    </div>
                    {editingOrg.owner_email ? (
                      <button
                        onClick={() => resendOwnerInvitation(editingOrg.id)}
                        disabled={resendingInvite}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm inline-flex items-center gap-2"
                        title="Einladung an Besitzer erneut versenden"
                      >
                        <Send className="h-4 w-4" />
                        {resendingInvite ? 'Wird gesendet...' : 'Einladung senden'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowOwnerInput(!showOwnerInput)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm inline-flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Besitzer zuweisen
                      </button>
                    )}
                  </div>

                  {showOwnerInput && !editingOrg.owner_email && (
                    <div className="space-y-2 pt-2 border-t border-gray-600">
                      <div className="text-xs text-gray-400 mb-2">
                        Wählen Sie einen vorhandenen Benutzer oder geben Sie eine E-Mail ein
                      </div>

                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignOwner(editingOrg.id, e.target.value)
                            e.target.value = ''
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={assigningOwner}
                      >
                        <option value="">Vorhandenen Benutzer auswählen...</option>
                        {allUsers.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>

                      <div className="text-xs text-gray-400 text-center py-1">oder</div>

                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={newOwnerEmail}
                          onChange={(e) => setNewOwnerEmail(e.target.value)}
                          placeholder="neue.email@example.com"
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={assigningOwner}
                        />
                        <button
                          onClick={() => {
                            if (newOwnerEmail) {
                              assignOwner(editingOrg.id, newOwnerEmail)
                            }
                          }}
                          disabled={assigningOwner || !newOwnerEmail}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {assigningOwner ? 'Wird zugewiesen...' : 'Einladen'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingOrg(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={updating}
                >
                  Abbrechen
                </button>
                <button
                  onClick={updateOrganization}
                  disabled={updating || !editFormData.name}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Aktualisieren...' : 'Änderungen speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
