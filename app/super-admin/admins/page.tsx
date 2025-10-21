'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Shield, UserPlus } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function AdminsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState<any[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    checkSuperAdminAndLoadData()
  }, [])

  async function checkSuperAdminAndLoadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/super-admin/admins')
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
      await loadAdmins()
    } catch (error) {
      console.error('Error:', error)
      router.push('/dashboard')
    }
  }

  async function loadAdmins() {
    try {
      // First get all super admins
      const { data: superAdmins, error: saError } = await supabase
        .from('super_admins')
        .select('*')
        .order('created_at', { ascending: false })

      if (saError) throw saError

      // Then get user details for each super admin
      const adminPromises = superAdmins.map(async (admin) => {
        const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id)
        return {
          ...admin,
          user: userData.user
        }
      })

      const adminsWithUsers = await Promise.all(adminPromises)
      setAdmins(adminsWithUsers)
    } catch (error) {
      console.error('Error loading admins:', error)
      toast.error('Fehler beim Laden der Super Admins')
    } finally {
      setLoading(false)
    }
  }

  async function toggleAdminStatus(adminId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('super_admins')
        .update({ is_active: !currentStatus })
        .eq('id', adminId)

      if (error) throw error

      toast.success(`Super Admin ${!currentStatus ? 'aktiviert' : 'deaktiviert'}`)
      await loadAdmins()
    } catch (error) {
      console.error('Error toggling admin status:', error)
      toast.error('Fehler beim Aktualisieren des Status')
    }
  }

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Lädt Super Admins...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 shadow-xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/super-admin')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Super Admins</h1>
                <p className="text-sm text-gray-400 mt-1">Systemadministratoren verwalten</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">E-Mail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Erstellt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-900">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-red-500 mr-2" />
                      <div className="text-sm font-medium text-white">
                        {admin.user?.user_metadata?.full_name || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{admin.user?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      admin.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {admin.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(admin.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => toggleAdminStatus(admin.id, admin.is_active)}
                      className={`px-3 py-1 rounded-lg ${
                        admin.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {admin.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
