// =============================================
// BILLING SUCCESS PAGE
// =============================================

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface CheckoutSession {
  status: string
  subscription: any
  customer_email: string
}

function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!sessionId) {
      setError('Keine Session-ID gefunden')
      setLoading(false)
      return
    }

    fetchCheckoutSession()
  }, [sessionId])

  const fetchCheckoutSession = async () => {
    try {
      const response = await fetch(`/api/billing/checkout?session_id=${sessionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden der Session')
      }

      setSession(data)
    } catch (error: any) {
      console.error('Error fetching checkout session:', error)
      setError(error.message || 'Fehler beim Laden der Session')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Zahlung wird verarbeitet...
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Bitte warten Sie, während wir Ihre Zahlung bestätigen.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto px-6">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            Fehler beim Verarbeiten der Zahlung
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {error}
          </p>
          <div className="mt-8 space-y-3">
            <Link
              href="/dashboard/billing"
              className="block w-full bg-blue-600 text-white rounded-lg px-4 py-3 text-center font-medium hover:bg-blue-700 transition-colors"
            >
              Zurück zur Billing-Seite
            </Link>
            <Link
              href="/dashboard"
              className="block w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 text-center font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Zum Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isPaymentSuccessful = session?.status === 'paid' || session?.status === 'complete'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md mx-auto px-6">
        {isPaymentSuccessful ? (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Zahlung erfolgreich!
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Vielen Dank für Ihr Abonnement. Ihr Account wurde erfolgreich upgradet.
            </p>
            
            {session?.customer_email && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Eine Bestätigungs-E-Mail wurde an <strong>{session.customer_email}</strong> gesendet.
                </p>
              </div>
            )}

            <div className="mt-8 space-y-3">
              <Link
                href="/dashboard"
                className="block w-full bg-blue-600 text-white rounded-lg px-4 py-3 text-center font-medium hover:bg-blue-700 transition-colors"
              >
                Zum Dashboard
              </Link>
              <Link
                href="/dashboard/billing"
                className="block w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 text-center font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Billing verwalten
              </Link>
            </div>

            <div className="mt-8 text-xs text-gray-500 dark:text-gray-400">
              <p>
                Bei Fragen zum Abonnement können Sie uns jederzeit kontaktieren.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Zahlung ausstehend
            </h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Ihre Zahlung wird noch verarbeitet. Sie erhalten eine E-Mail-Bestätigung, sobald die Zahlung abgeschlossen ist.
            </p>

            <div className="mt-8 space-y-3">
              <Link
                href="/dashboard/billing"
                className="block w-full bg-blue-600 text-white rounded-lg px-4 py-3 text-center font-medium hover:bg-blue-700 transition-colors"
              >
                Status prüfen
              </Link>
              <Link
                href="/dashboard"
                className="block w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-3 text-center font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Zum Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <ArrowPathIcon className="mx-auto h-12 w-12 animate-spin text-blue-500" />
            <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Lädt...
            </h2>
          </div>
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  )
}