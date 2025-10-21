'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

interface Invitation {
  id: string
  organization_id: string
  email: string
  role: string
  status: string
  expires_at: string
  organization: {
    name: string
  }
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadInvitation()
    checkUser()
  }, [token])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadInvitation = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          id,
          organization_id,
          email,
          role,
          status,
          expires_at,
          organization:organizations(name)
        `)
        .eq('token', token)
        .single()

      if (error) {
        console.error('Error loading invitation:', error)
        setError('Einladung nicht gefunden oder ungültig')
        return
      }

      // Check if invitation is expired
      const now = new Date()
      const expiresAt = new Date(data.expires_at)
      
      if (now > expiresAt) {
        setError('Diese Einladung ist abgelaufen')
        return
      }

      if (data.status !== 'pending') {
        setError(`Diese Einladung wurde bereits ${data.status === 'accepted' ? 'angenommen' : 'abgelehnt'}`)
        return
      }

      setInvitation(data as any)
    } catch (error) {
      console.error('Error loading invitation:', error)
      setError('Fehler beim Laden der Einladung')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!invitation || !user) {
      toast.error('Sie müssen angemeldet sein, um die Einladung anzunehmen')
      router.push(`/login?redirect=/invite/${token}`)
      return
    }

    // Check if user email matches invitation email
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      toast.error('Die Einladung ist für eine andere E-Mail-Adresse bestimmt')
      return
    }

    try {
      setAccepting(true)

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', invitation.organization_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (existingMember) {
        toast.error('Sie sind bereits Mitglied dieser Organisation')
        router.push('/dashboard')
        return
      }

      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: user.id,
          role: invitation.role,
          is_active: true,
          joined_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Error adding member:', memberError)
        toast.error('Fehler beim Beitreten zur Organisation')
        return
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('organization_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) {
        console.error('Error updating invitation:', updateError)
      }

      toast.success(`Willkommen bei ${invitation.organization.name}!`)
      router.push('/dashboard')

    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('Fehler beim Annehmen der Einladung')
    } finally {
      setAccepting(false)
    }
  }

  const rejectInvitation = async () => {
    if (!invitation) return

    try {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitation.id)

      if (error) {
        console.error('Error rejecting invitation:', error)
        toast.error('Fehler beim Ablehnen der Einladung')
        return
      }

      toast.success('Einladung abgelehnt')
      setInvitation({ ...invitation, status: 'rejected' })
    } catch (error) {
      console.error('Error rejecting invitation:', error)
      toast.error('Fehler beim Ablehnen der Einladung')
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner': return 'Besitzer'
      case 'admin': return 'Administrator'
      case 'member': return 'Mitglied'
      case 'viewer': return 'Viewer'
      default: return role
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-dots mx-auto mb-4">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="text-gray-600">Lade Einladung...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 md:p-8 text-center">
            <XCircleIcon className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-red-500 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Einladung ungültig</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">{error}</p>
            <Link
              href="/dashboard"
              className="inline-block px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Zum Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 md:p-8">
          <div className="text-center mb-4 sm:mb-5 md:mb-6">
            <div className="mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Logo size={48} className="sm:hidden" />
              <Logo size={56} className="hidden sm:block md:hidden" />
              <Logo size={64} className="hidden md:block" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Sie wurden eingeladen!</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Sie wurden eingeladen, der Organisation <strong>{invitation.organization.name}</strong> als
              <strong> {getRoleDisplayName(invitation.role)}</strong> beizutreten.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
              <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-900">Einladung läuft ab am:</p>
                <p className="text-xs sm:text-sm text-blue-700">
                  {new Date(invitation.expires_at).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {!user ? (
            <div className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-gray-600 text-center mb-3 sm:mb-4">
                Sie müssen ein Konto erstellen oder sich anmelden, um diese Einladung anzunehmen.
              </p>
              <div className="space-y-2 sm:space-y-3">
                <Link
                  href={`/register?token=${token}`}
                  className="w-full flex items-center justify-center px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                >
                  Konto erstellen
                </Link>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">oder</span>
                  </div>
                </div>
                <Link
                  href={`/login?redirect=/invite/${token}`}
                  className="w-full flex items-center justify-center px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Anmelden (Bestehendes Konto)
                </Link>
              </div>
            </div>
          ) : user.email?.toLowerCase() !== invitation.email.toLowerCase() ? (
            <div className="text-center">
              <p className="text-xs sm:text-sm text-red-600 mb-3 sm:mb-4">
                Diese Einladung ist für {invitation.email}, aber Sie sind als {user.email} angemeldet.
              </p>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 py-2 text-sm sm:text-base bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Abmelden und erneut versuchen
              </button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              <button
                onClick={acceptInvitation}
                disabled={accepting}
                className="w-full flex items-center justify-center px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                {accepting ? 'Wird angenommen...' : 'Einladung annehmen'}
              </button>
              <button
                onClick={rejectInvitation}
                className="w-full flex items-center justify-center px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Einladung ablehnen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}