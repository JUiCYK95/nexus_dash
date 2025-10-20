'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

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
          <div className="bg-white rounded-xl shadow-soft p-8 text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Einladung ungültig</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link 
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
        <div className="bg-white rounded-xl shadow-soft p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-ocean rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.386"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sie wurden eingeladen!</h1>
            <p className="text-gray-600">
              Sie wurden eingeladen, der Organisation <strong>{invitation.organization.name}</strong> als 
              <strong> {getRoleDisplayName(invitation.role)}</strong> beizutreten.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Einladung läuft ab am:</p>
                <p className="text-sm text-blue-700">
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
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center mb-4">
                Sie müssen ein Konto erstellen oder sich anmelden, um diese Einladung anzunehmen.
              </p>
              <div className="space-y-3">
                <Link
                  href={`/register?token=${token}`}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
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
                  className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Anmelden (Bestehendes Konto)
                </Link>
              </div>
            </div>
          ) : user.email?.toLowerCase() !== invitation.email.toLowerCase() ? (
            <div className="text-center">
              <p className="text-sm text-red-600 mb-4">
                Diese Einladung ist für {invitation.email}, aber Sie sind als {user.email} angemeldet.
              </p>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Abmelden und erneut versuchen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={acceptInvitation}
                disabled={accepting}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                {accepting ? 'Wird angenommen...' : 'Einladung annehmen'}
              </button>
              <button
                onClick={rejectInvitation}
                className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircleIcon className="h-5 w-5 mr-2" />
                Einladung ablehnen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}