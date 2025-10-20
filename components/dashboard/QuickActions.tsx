'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  PaperAirplaneIcon,
  UsersIcon,
  ChartBarIcon,
  XMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import EnhancedButton from '@/components/ui/EnhancedButton'

export default function QuickActions() {
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newMessage, setNewMessage] = useState({ phone: '', message: '' })
  const [importFile, setImportFile] = useState<File | null>(null)
  const router = useRouter()

  const handleNewMessage = () => {
    setShowNewMessageModal(true)
  }

  const handleSendMessage = async () => {
    if (!newMessage.phone || !newMessage.message) {
      toast.error('Bitte füllen Sie alle Felder aus')
      return
    }

    try {
      // Mock API call - in production, this would send via WAHA
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Nachricht gesendet!')
      setNewMessage({ phone: '', message: '' })
      setShowNewMessageModal(false)
    } catch (error) {
      toast.error('Fehler beim Senden der Nachricht')
    }
  }

  const handleImportContacts = () => {
    setShowImportModal(true)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Bitte wählen Sie eine Datei aus')
      return
    }

    try {
      // Mock import process
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success(`${Math.floor(Math.random() * 50 + 10)} Kontakte importiert!`)
      setImportFile(null)
      setShowImportModal(false)
      router.push('/dashboard/contacts')
    } catch (error) {
      toast.error('Fehler beim Importieren')
    }
  }

  const handleGenerateReport = async () => {
    try {
      toast.loading('Report wird erstellt...')
      // Mock report generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.dismiss()
      toast.success('Report erstellt und heruntergeladen!')
      
      // Create mock CSV content
      const csvContent = `Name,Nachrichten,Letzter Kontakt
Anna Müller,245,${new Date().toLocaleDateString('de-DE')}
Max Schmidt,189,${new Date(Date.now() - 86400000).toLocaleDateString('de-DE')}
Laura Weber,156,${new Date(Date.now() - 172800000).toLocaleDateString('de-DE')}`
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `whatsapp-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Fehler beim Erstellen des Reports')
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex items-center space-x-3"
      >
        <EnhancedButton
          onClick={handleGenerateReport}
          variant="ghost"
          size="sm"
          icon={<ChartBarIcon className="h-4 w-4" />}
        >
          Report
        </EnhancedButton>

        <EnhancedButton
          onClick={handleImportContacts}
          variant="secondary"
          size="sm"
          icon={<UsersIcon className="h-4 w-4" />}
        >
          Import
        </EnhancedButton>

        <EnhancedButton
          onClick={handleNewMessage}
          variant="gradient"
          size="sm"
          icon={<PaperAirplaneIcon className="h-4 w-4" />}
        >
          Neue Nachricht
        </EnhancedButton>
      </motion.div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowNewMessageModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="glassmorphism rounded-2xl p-6 w-full max-w-md border border-white/20 dark:border-gray-700/50 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Neue Nachricht</h3>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNewMessageModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </motion.button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefonnummer
                </label>
                <input
                  type="tel"
                  placeholder="+49 151 1234567"
                  value={newMessage.phone}
                  onChange={(e) => setNewMessage({...newMessage, phone: e.target.value})}
                  className="input-modern"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nachricht
                </label>
                <textarea
                  placeholder="Ihre Nachricht..."
                  rows={4}
                  value={newMessage.message}
                  onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                  className="input-modern resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <EnhancedButton
                onClick={() => setShowNewMessageModal(false)}
                variant="ghost"
                size="md"
              >
                Abbrechen
              </EnhancedButton>
              <EnhancedButton
                onClick={handleSendMessage}
                variant="gradient"
                size="md"
              >
                Senden
              </EnhancedButton>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Import Contacts Modal */}
      {showImportModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowImportModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="glassmorphism rounded-2xl p-6 w-full max-w-md border border-white/20 dark:border-gray-700/50 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kontakte importieren</h3>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </motion.button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CSV-Datei auswählen
                </label>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center transition-colors hover:border-blue-500 dark:hover:border-blue-400"
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <motion.div
                      animate={importFile ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <DocumentArrowDownIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                    </motion.div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {importFile ? importFile.name : 'Datei auswählen oder hierher ziehen'}
                    </p>
                  </label>
                </motion.div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-700/50">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Format:</strong> CSV mit Spalten: Name, Telefonnummer, Email (optional)
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <EnhancedButton
                onClick={() => setShowImportModal(false)}
                variant="ghost"
                size="md"
              >
                Abbrechen
              </EnhancedButton>
              <EnhancedButton
                onClick={handleImport}
                disabled={!importFile}
                variant="primary"
                size="md"
              >
                Importieren
              </EnhancedButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}