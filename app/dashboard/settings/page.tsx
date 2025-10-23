'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  MoonIcon,
  SunIcon,
  UserPlusIcon,
  CogIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useTenant } from '@/contexts/TenantContext'
import { createClient } from '@/lib/supabase'
import { fetchWithOrg, getOrgHeaders } from '@/lib/api-utils'

export default function SettingsPage() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<string>('disconnected')
  const [loading, setLoading] = useState(false)
  const [autoReplies, setAutoReplies] = useState(false)
  const [readReceipts, setReadReceipts] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  
  // Team Management States
  const [activeTab, setActiveTab] = useState('whatsapp')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  
  // Organization Settings States
  const [organizationName, setOrganizationName] = useState('')
  const [editingOrgName, setEditingOrgName] = useState(false)

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const { organization, member, canPerform } = useTenant()
  const supabase = createClient()

  useEffect(() => {
    checkSessionStatus()
    loadTeamMembers()

    // Check for saved dark mode preference - default to true (dark mode)
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode === null) {
      // No preference saved - default to dark mode
      setDarkMode(true)
      document.documentElement.classList.add('dark')
      localStorage.setItem('darkMode', 'true')
    } else {
      const isDark = JSON.parse(savedDarkMode)
      setDarkMode(isDark)
      if (isDark) {
        document.documentElement.classList.add('dark')
      }
    }

    // Set organization name
    if (organization) {
      setOrganizationName(organization.name)
    }
  }, [organization])

  const checkSessionStatus = async () => {
    try {
      const response = await fetchWithOrg('/api/whatsapp/session-status')
      const data = await response.json()
      setSessionStatus(data.status || 'disconnected')
    } catch (error) {
      console.error('Error checking session status:', error)
    }
  }

  const getQRCode = async () => {
    setLoading(true)
    try {
      const response = await fetchWithOrg('/api/whatsapp/qr-code')
      const data = await response.json()

      if (data.qr) {
        // Convert base64 to data URI if needed
        const qrData = data.qr.startsWith('data:')
          ? data.qr
          : `data:${data.mimetype || 'image/png'};base64,${data.qr}`
        setQrCode(qrData)
        toast.success('QR-Code geladen! Scannen Sie ihn mit WhatsApp.')
      } else {
        toast.error('Kein QR-Code verfügbar. Session möglicherweise bereits verbunden.')
      }
    } catch (error) {
      toast.error('Fehler beim Laden des QR-Codes')
      console.error('Error getting QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSession = async () => {
    setLoading(true)
    try {
      const response = await fetchWithOrg('/api/whatsapp/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName: 'default' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Session erfolgreich erstellt!')
        setTimeout(() => getQRCode(), 1000)
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen der Session')
      console.error('Error creating session:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return 'text-green-600'
      case 'SCAN_QR_CODE': return 'text-yellow-600'
      case 'FAILED': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WORKING': return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'FAILED': return <XCircleIcon className="h-5 w-5 text-red-600" />
      default: return <QrCodeIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'WORKING': return 'Verbunden'
      case 'SCAN_QR_CODE': return 'QR-Code scannen'
      case 'FAILED': return 'Verbindung fehlgeschlagen'
      case 'STOPPED': return 'Gestoppt'
      default: return 'Nicht verbunden'
    }
  }

  const toggleAutoReplies = async () => {
    const newValue = !autoReplies
    setAutoReplies(newValue)
    
    try {
      // Mock API call to save setting
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success(`Automatische Antworten ${newValue ? 'aktiviert' : 'deaktiviert'}`)
    } catch (error) {
      // Revert on error
      setAutoReplies(!newValue)
      toast.error('Fehler beim Speichern der Einstellung')
    }
  }

  const toggleReadReceipts = async () => {
    const newValue = !readReceipts
    setReadReceipts(newValue)
    
    try {
      // Mock API call to save setting
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success(`Lesebestätigungen ${newValue ? 'aktiviert' : 'deaktiviert'}`)
    } catch (error) {
      // Revert on error
      setReadReceipts(!newValue)
      toast.error('Fehler beim Speichern der Einstellung')
    }
  }

  const toggleDarkMode = async () => {
    const newValue = !darkMode
    setDarkMode(newValue)
    
    try {
      // Save to localStorage
      localStorage.setItem('darkMode', JSON.stringify(newValue))
      
      // Apply dark mode class to document
      if (newValue) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      
      toast.success(`Dark Mode ${newValue ? 'aktiviert' : 'deaktiviert'}`)
    } catch (error) {
      // Revert on error
      setDarkMode(!newValue)
      toast.error('Fehler beim Speichern der Einstellung')
    }
  }

  // Team Management Functions
  const loadTeamMembers = async () => {
    if (!organization) return

    setLoadingMembers(true)
    try {
      const response = await fetchWithOrg('/api/team/members')
      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('Error loading team members:', result.error)
        toast.error('Fehler beim Laden der Teammitglieder')
        return
      }

      setTeamMembers(result.data.members || [])
    } catch (error) {
      console.error('Error loading team members:', error)
      toast.error('Fehler beim Laden der Teammitglieder')
    } finally {
      setLoadingMembers(false)
    }
  }

  const inviteTeamMember = async () => {
    if (!inviteEmail || !organization || !canPerform('manage_members')) {
      toast.error('Keine Berechtigung oder ungültige E-Mail')
      return
    }

    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Nicht angemeldet')
        return
      }

      // Call the invite API
      const response = await fetchWithOrg('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          organizationId: organization.id,
          userId: user.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Senden der Einladung')
      }

      toast.success(data.message || `Einladung erfolgreich an ${inviteEmail} gesendet`)
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('member')
      
      // Reload team members to show pending invitations
      loadTeamMembers()
      
    } catch (error: any) {
      console.error('Error inviting member:', error)
      toast.error(error.message || 'Fehler beim Senden der Einladung')
    } finally {
      setLoading(false)
    }
  }

  const updateMemberRole = async (memberId: string, newRole: string) => {
    if (!canPerform('manage_members')) {
      toast.error('Keine Berechtigung')
      return
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) {
        console.error('Error updating member role:', error)
        toast.error('Fehler beim Aktualisieren der Rolle')
        return
      }

      toast.success('Rolle erfolgreich aktualisiert')
      loadTeamMembers()
    } catch (error) {
      console.error('Error updating member role:', error)
      toast.error('Fehler beim Aktualisieren der Rolle')
    }
  }

  const removeMember = async (memberId: string) => {
    if (!canPerform('manage_members')) {
      toast.error('Keine Berechtigung')
      return
    }

    // Find the member to check if it's a pending invitation
    const teamMember = teamMembers.find(m => m.id === memberId)
    const isPendingOrExpired = teamMember?.status === 'pending' || teamMember?.status === 'expired'

    const confirmMessage = isPendingOrExpired
      ? 'Sind Sie sicher, dass Sie diese Einladung entfernen möchten?'
      : 'Sind Sie sicher, dass Sie dieses Mitglied entfernen möchten?'

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      if (isPendingOrExpired) {
        // Delete the invitation via API route
        const response = await fetchWithOrg(`/api/team/invitations/${memberId}`, {
          method: 'DELETE'
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          console.error('Error removing invitation:', data.error)
          toast.error(data.error || 'Fehler beim Entfernen der Einladung')
          return
        }

        toast.success('Einladung erfolgreich entfernt')
      } else {
        // Deactivate active member
        const { error } = await supabase
          .from('organization_members')
          .update({ is_active: false })
          .eq('id', memberId)

        if (error) {
          console.error('Error removing member:', error)
          toast.error('Fehler beim Entfernen des Mitglieds')
          return
        }

        toast.success('Mitglied erfolgreich entfernt')
      }

      loadTeamMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Fehler beim Entfernen')
    }
  }

  const updateOrganizationName = async () => {
    if (!organization || !canPerform('manage_settings') || !organizationName.trim()) {
      toast.error('Keine Berechtigung oder ungültiger Name')
      return
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: organizationName.trim() })
        .eq('id', organization.id)

      if (error) {
        console.error('Error updating organization name:', error)
        toast.error('Fehler beim Aktualisieren des Namens')
        return
      }

      toast.success('Organisationsname erfolgreich aktualisiert')
      setEditingOrgName(false)
    } catch (error) {
      console.error('Error updating organization name:', error)
      toast.error('Fehler beim Aktualisieren des Namens')
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner': return 'Besitzer'
      case 'admin': return 'Admin'
      case 'member': return 'Mitglied'
      case 'viewer': return 'Viewer'
      default: return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
      case 'admin': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
      case 'member': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
      case 'viewer': return 'bg-gray-200 text-gray-700'
      default: return 'bg-gray-200 text-gray-700'
    }
  }

  const handlePasswordChange = async () => {
    // Validierung
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Bitte füllen Sie alle Felder aus')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Die neuen Passwörter stimmen nicht überein')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Das neue Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    setChangingPassword(true)

    try {
      // Zuerst den Benutzer mit aktuellem Passwort verifizieren
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        toast.error('Benutzer nicht gefunden')
        return
      }

      // Versuche, sich mit dem aktuellen Passwort anzumelden (zur Verifizierung)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        toast.error('Das aktuelle Passwort ist falsch')
        return
      }

      // Passwort aktualisieren
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('Error updating password:', updateError)
        toast.error('Fehler beim Ändern des Passworts: ' + updateError.message)
        return
      }

      // Erfolgreich - Felder zurücksetzen
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Passwort erfolgreich geändert!')

    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error('Fehler beim Ändern des Passworts')
    } finally {
      setChangingPassword(false)
    }
  }

  const tabs = [
    { id: 'whatsapp', name: 'WhatsApp', icon: ChatBubbleLeftRightIcon },
    { id: 'team', name: 'Team', icon: UserGroupIcon },
    { id: 'organization', name: 'Organisation', icon: CogIcon },
    { id: 'security', name: 'Sicherheit', icon: ShieldCheckIcon },
    // { id: 'billing', name: 'Billing', icon: CreditCardIcon }, // Temporarily hidden
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Einstellungen</h1>
          <p className="text-gray-400 mt-1">Organisation und Konfiguration verwalten</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-700/50">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700/50'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'whatsapp' && (
          <>
            {/* WhatsApp Connection Status */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">WhatsApp Verbindung</h3>
              <p className="text-sm text-gray-400">Verwalten Sie Ihre WhatsApp-Session</p>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(sessionStatus)}
              <span className={`text-sm font-medium ${getStatusColor(sessionStatus)} text-gray-300`}>
                {getStatusText(sessionStatus)}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Session Controls */}
            <div className="flex space-x-4">
              <button
                onClick={createSession}
                disabled={loading}
                className="px-4 py-2 bg-whatsapp-600 text-white rounded-lg hover:bg-whatsapp-700 disabled:opacity-50"
              >
                {loading ? 'Erstelle Session...' : 'Neue Session erstellen'}
              </button>
              
              <button
                onClick={getQRCode}
                disabled={loading || sessionStatus === 'WORKING'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Lade QR-Code...' : 'QR-Code abrufen'}
              </button>
              
              <button
                onClick={checkSessionStatus}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Status prüfen
              </button>
            </div>

            {/* QR Code Display */}
            {qrCode && (
              <div className="border-2 border-dashed border-gray-700/50 rounded-lg p-8 text-center">
                <QrCodeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">QR-Code scannen</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Öffnen Sie WhatsApp auf Ihrem Telefon und scannen Sie den QR-Code
                </p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Der QR-Code läuft automatisch ab. Aktualisieren Sie bei Bedarf.
                </p>
              </div>
            )}

            {/* Connection Instructions */}
            {sessionStatus !== 'WORKING' && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-300 mb-2">So verbinden Sie WhatsApp:</h4>
                <ol className="text-sm text-blue-400 space-y-1 list-decimal list-inside">
                  <li>Klicken Sie auf "Neue Session erstellen"</li>
                  <li>Klicken Sie auf "QR-Code abrufen"</li>
                  <li>Öffnen Sie WhatsApp auf Ihrem Telefon</li>
                  <li>Gehen Sie zu Einstellungen → Verknüpfte Geräte</li>
                  <li>Tippen Sie auf "Gerät verknüpfen"</li>
                  <li>Scannen Sie den angezeigten QR-Code</li>
                </ol>
              </div>
            )}

            {/* Success Message */}
            {sessionStatus === 'WORKING' && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-green-300">Erfolgreich verbunden!</h4>
                    <p className="text-sm text-green-400">
                      Ihr WhatsApp ist jetzt mit dem Dashboard verbunden. Sie können Nachrichten senden und empfangen.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Darstellung</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-white">Dark Mode</h4>
                <p className="text-sm text-gray-400">Dunkles Design für bessere Nutzung bei wenig Licht</p>
              </div>
              <button 
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform flex items-center justify-center ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}>
                  {darkMode ? (
                    <MoonIcon className="h-2.5 w-2.5 text-blue-600" />
                  ) : (
                    <SunIcon className="h-2.5 w-2.5 text-yellow-500" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">WhatsApp Einstellungen</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-white">Automatische Antworten</h4>
                <p className="text-sm text-gray-400">Aktivieren Sie automatische Antworten für eingehende Nachrichten</p>
              </div>
              <button 
                onClick={toggleAutoReplies}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoReplies 
                    ? 'bg-whatsapp-600 hover:bg-whatsapp-700' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoReplies ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-white">Lesebestätigungen</h4>
                <p className="text-sm text-gray-400">Nachrichten automatisch als gelesen markieren</p>
              </div>
              <button 
                onClick={toggleReadReceipts}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  readReceipts 
                    ? 'bg-whatsapp-600 hover:bg-whatsapp-700' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  readReceipts ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Team Management Tab */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Team Overview */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Team-Verwaltung</h3>
                  <p className="text-sm text-gray-400">Teammitglieder einladen und verwalten</p>
                </div>
                {canPerform('manage_members') && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlusIcon className="h-5 w-5 mr-2" />
                    Einladen
                  </button>
                )}
              </div>

              {/* Team Members List */}
              <div className="space-y-4">
                {loadingMembers ? (
                  <div className="text-center py-8">
                    <div className="loading-dots mx-auto mb-3">
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <p className="text-sm text-gray-400">Lade Teammitglieder...</p>
                  </div>
                ) : teamMembers.length > 0 ? (
                  teamMembers.map((teamMember) => (
                    <div key={teamMember.id} className={`flex items-center justify-between p-4 border rounded-lg ${
                      teamMember.status === 'pending'
                        ? 'border-yellow-500/50 bg-yellow-900/10'
                        : teamMember.status === 'expired'
                        ? 'border-red-500/50 bg-red-900/10 opacity-60'
                        : 'border-gray-700/50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          teamMember.status === 'pending'
                            ? 'bg-yellow-500/20 border border-yellow-500/50'
                            : teamMember.status === 'expired'
                            ? 'bg-red-500/20 border border-red-500/50'
                            : 'bg-gradient-cosmic'
                        }`}>
                          <span className={`font-bold ${
                            teamMember.status === 'pending'
                              ? 'text-yellow-400'
                              : teamMember.status === 'expired'
                              ? 'text-red-400'
                              : 'text-white'
                          }`}>
                            {(teamMember.name || teamMember.email || 'U').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-white">
                              {teamMember.name || teamMember.email || `User ${teamMember.userId?.substring(0, 8)}`}
                            </p>
                            {teamMember.status === 'pending' && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
                                Ausstehend
                              </span>
                            )}
                            {teamMember.status === 'expired' && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/50">
                                Abgelaufen
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {teamMember.email}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getRoleBadgeColor(teamMember.role)}`}>
                              {getRoleDisplayName(teamMember.role)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {teamMember.status === 'pending' || teamMember.status === 'expired'
                                ? `Eingeladen: ${new Date(teamMember.joinedAt).toLocaleDateString('de-DE')}`
                                : `Beigetreten: ${new Date(teamMember.joinedAt).toLocaleDateString('de-DE')}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      {canPerform('manage_members') && teamMember.userId !== member?.user_id && (
                        <div className="flex items-center space-x-2">
                          {teamMember.status === 'active' ? (
                            <>
                              <select
                                value={teamMember.role}
                                onChange={(e) => updateMemberRole(teamMember.id, e.target.value)}
                                className="text-sm border border-gray-700/50 rounded-md px-2 py-1 bg-gray-800/50 text-white"
                              >
                                <option value="viewer">Viewer</option>
                                <option value="member">Mitglied</option>
                                <option value="admin">Admin</option>
                                {member?.role === 'owner' && <option value="owner">Besitzer</option>}
                              </select>
                              <button
                                onClick={() => removeMember(teamMember.id)}
                                className="p-2 text-red-600 hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => removeMember(teamMember.id)}
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              {teamMember.status === 'expired' ? 'Entfernen' : 'Einladung widerrufen'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <UserGroupIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400">Noch keine Teammitglieder</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Organization Settings Tab */}
        {activeTab === 'organization' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Organisations-Einstellungen</h3>
              
              <div className="space-y-6">
                {/* Organization Name */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Organisationsname
                  </label>
                  <div className="flex items-center space-x-3">
                    {editingOrgName ? (
                      <>
                        <input
                          type="text"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800/50 text-white"
                        />
                        <button
                          onClick={updateOrganizationName}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={() => {
                            setEditingOrgName(false)
                            setOrganizationName(organization?.name || '')
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          Abbrechen
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-white">{organization?.name}</span>
                        {canPerform('manage_settings') && (
                          <button
                            onClick={() => setEditingOrgName(true)}
                            className="p-2 text-blue-600 hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Organization Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Abonnement-Plan
                    </label>
                    <div className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                      <span className="text-white capitalize">
                        {organization?.subscription_plan}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Status
                    </label>
                    <div className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                      <span className={`text-sm font-medium ${
                        organization?.subscription_status === 'active' ? 'text-green-600' :
                        organization?.subscription_status === 'trialing' ? 'text-blue-600' :
                        'text-yellow-600'
                      }`}>
                        {organization?.subscription_status === 'active' ? 'Aktiv' :
                         organization?.subscription_status === 'trialing' ? 'Testversion' :
                         organization?.subscription_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Password Change Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Passwort ändern</h3>

              <div className="space-y-4 max-w-md">
                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-white mb-2">
                    Aktuelles Passwort
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800/50 text-white pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showCurrentPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-white mb-2">
                    Neues Passwort
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800/50 text-white pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showNewPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Mindestens 8 Zeichen</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                    Neues Passwort bestätigen
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800/50 text-white pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Change Password Button */}
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {changingPassword ? 'Passwort wird geändert...' : 'Passwort ändern'}
                </button>
              </div>
            </div>

            {/* Other Security Settings */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Weitere Sicherheitseinstellungen</h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">Zwei-Faktor-Authentifizierung</h4>
                    <p className="text-sm text-gray-400">Zusätzliche Sicherheit für Ihr Konto</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Aktivieren
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">API-Schlüssel</h4>
                    <p className="text-sm text-gray-400">Verwalten Sie Ihre API-Zugriffsschlüssel</p>
                  </div>
                  <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    <KeyIcon className="h-4 w-4 mr-2" />
                    Verwalten
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Billing & Abonnement</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 border border-gray-700/50 rounded-lg">
                    <h4 className="font-medium text-white">Starter</h4>
                    <p className="text-2xl font-bold text-white mt-2">€9/Monat</p>
                    <ul className="text-sm text-gray-400 mt-4 space-y-1">
                      <li>1.000 Nachrichten</li>
                      <li>500 Kontakte</li>
                      <li>10 Kampagnen</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-900/20">
                    <h4 className="font-medium text-white">Pro</h4>
                    <p className="text-2xl font-bold text-white mt-2">€29/Monat</p>
                    <ul className="text-sm text-gray-400 mt-4 space-y-1">
                      <li>10.000 Nachrichten</li>
                      <li>5.000 Kontakte</li>
                      <li>100 Kampagnen</li>
                    </ul>
                    <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Upgrade
                    </button>
                  </div>
                  
                  <div className="p-4 border border-gray-700/50 rounded-lg">
                    <h4 className="font-medium text-white">Enterprise</h4>
                    <p className="text-2xl font-bold text-white mt-2">€99/Monat</p>
                    <ul className="text-sm text-gray-400 mt-4 space-y-1">
                      <li>Unbegrenzt</li>
                      <li>Unbegrenzt</li>
                      <li>Unbegrenzt</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Teammitglied einladen</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800/50 text-white"
                    placeholder="beispiel@email.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Rolle
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-700/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800/50 text-white"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="member">Mitglied</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={inviteTeamMember}
                  disabled={loading || !inviteEmail}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Wird gesendet...' : 'Einladung senden'}
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}