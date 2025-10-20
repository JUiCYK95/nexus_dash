'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
  Filter
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
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)

  useEffect(() => {
    checkSuperAdmin()
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

  function getStatusBadge(status: string) {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Aktiv' },
      trialing: { color: 'bg-blue-100 text-blue-800', icon: Clock, text: 'Testphase' },
      canceled: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Gekündigt' },
      past_due: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Überfällig' },
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
      starter: 'bg-gray-100 text-gray-800',
      professional: 'bg-purple-100 text-purple-800',
      business: 'bg-blue-100 text-blue-800',
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
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Organisationen</h1>
                <p className="text-sm text-gray-600 mt-1">{organizations.length} Organisationen gesamt</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/super-admin')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
        <div className="bg-white rounded-lg shadow p-4 mb-6">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mitglieder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p>Keine Organisationen gefunden</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{org.name}</div>
                          <div className="text-sm text-gray-500">/{org.slug}</div>
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
                          <div className="text-xs text-gray-500 mt-1">
                            Endet: {new Date(org.trial_ends_at).toLocaleDateString('de-DE')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <Users className="h-4 w-4 text-gray-400" />
                          {org.member_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(org.created_at).toLocaleDateString('de-DE')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(org.created_at).toLocaleTimeString('de-DE')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setEditingOrg(org)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Bearbeiten"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteOrganization(org.id, org.name)}
                          className="text-red-600 hover:text-red-900"
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

      {/* Create/Edit Modal would go here */}
      {(showCreateModal || editingOrg) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingOrg ? 'Organisation bearbeiten' : 'Neue Organisation erstellen'}
            </h2>
            <p className="text-gray-600 mb-4">Feature wird im nächsten Schritt implementiert</p>
            <button
              onClick={() => {
                setShowCreateModal(false)
                setEditingOrg(null)
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
