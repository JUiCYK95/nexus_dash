// =============================================
// BILLING DASHBOARD PAGE
// =============================================

'use client'

import { useState, useEffect } from 'react'
import { useTenant, useCanPerform } from '@/contexts/TenantContext'
import { 
  CreditCardIcon, 
  DocumentTextIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { formatPrice, calculateYearlySavings } from '@/lib/stripe-client'
import { createClient } from '@/lib/supabase'

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    description: 'Perfekt für kleine Werkstätten',
    monthlyPrice: 47900, // €479.00
    yearlyPrice: 479000, // €4,790.00
    features: [
      '1 Standort',
      'WhatsApp Integration',
      'Basis Automatisierung',
      'Email Support'
    ],
    color: 'blue'
  },
  professional: {
    name: 'Professional',
    description: 'Ideal für wachsende Betriebe',
    monthlyPrice: 77900, // €779.00
    yearlyPrice: 779000, // €7,790.00
    features: [
      '1 Standort',
      'Erweiterte Automatisierung',
      'Priority Support',
      'Analytics Dashboard',
      'Team Collaboration'
    ],
    color: 'purple',
    popular: true
  },
  business: {
    name: 'Business',
    description: 'Für etablierte Unternehmen',
    monthlyPrice: 117900, // €1,179.00
    yearlyPrice: 1179000, // €11,790.00
    features: [
      '1 Standort',
      'Custom Workflows',
      '24/7 Phone Support',
      'API Zugang',
      'White-Label Options'
    ],
    color: 'green'
  }
}

interface BillingInfo {
  subscription_plan: string
  subscription_status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  trial_ends_at: string | null
}

export default function BillingPage() {
  const { organization } = useTenant()
  const canManageBilling = useCanPerform('manage_billing')
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  useEffect(() => {
    if (organization) {
      setBillingInfo({
        subscription_plan: organization.subscription_plan,
        subscription_status: organization.subscription_status,
        stripe_customer_id: organization.stripe_customer_id || null,
        stripe_subscription_id: organization.stripe_subscription_id || null,
        trial_ends_at: organization.trial_ends_at || null,
      })
      setLoading(false)
    }
  }, [organization])

  const handleUpgrade = async (plan: string) => {
    if (!organization || !canManageBilling) {
      toast.error('Keine Berechtigung für Billing-Verwaltung')
      return
    }

    setProcessingPlan(plan)
    
    try {
      // Get auth token from Supabase client
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Nicht authentifiziert')
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-organization-id': organization.id
        },
        body: JSON.stringify({
          plan,
          interval: billingInterval,
          organizationId: organization.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der Checkout-Session')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error: any) {
      console.error('Upgrade error:', error)
      toast.error(error.message || 'Fehler beim Upgrade')
    } finally {
      setProcessingPlan(null)
    }
  }

  const handleManageBilling = async () => {
    if (!organization?.stripe_customer_id) {
      toast.error('Kein Stripe-Kunde gefunden')
      return
    }

    setLoading(true)
    
    try {
      // Get auth token from Supabase client
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Nicht authentifiziert')
      }

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-organization-id': organization.id
        },
        body: JSON.stringify({
          organizationId: organization.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Öffnen des Billing-Portals')
      }

      window.location.href = data.url
    } catch (error: any) {
      console.error('Billing portal error:', error)
      toast.error(error.message || 'Fehler beim Öffnen des Billing-Portals')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!canManageBilling) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
        <h3 className="mt-4 text-lg font-medium text-white">
          Keine Berechtigung
        </h3>
        <p className="mt-2 text-gray-400">
          Sie haben keine Berechtigung, die Billing-Einstellungen zu verwalten.
        </p>
      </div>
    )
  }

  const currentPlan = SUBSCRIPTION_PLANS[billingInfo?.subscription_plan as keyof typeof SUBSCRIPTION_PLANS] || SUBSCRIPTION_PLANS.starter
  const isTrialing = billingInfo?.subscription_status === 'trialing'
  const isActive = billingInfo?.subscription_status === 'active'
  const isPastDue = billingInfo?.subscription_status === 'past_due'

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-8 pb-4">
        <div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Billing & Abonnement
          </h1>
          <p className="text-lg text-gray-400">
            Verwalten Sie Ihr Abonnement und Ihre Rechnungen
          </p>
        </div>
        
        {billingInfo?.stripe_customer_id && (
          <button
            onClick={handleManageBilling}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <CogIcon className="h-5 w-5" />
            <span>Billing verwalten</span>
          </button>
        )}
      </div>

      {/* Current Subscription Status */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="p-4 rounded-2xl bg-blue-600/20">
              <CreditCardIcon className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {currentPlan.name} Plan
              </h3>
              <div className="flex items-center space-x-3">
                {isTrialing && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-600/20 text-yellow-300 border border-yellow-500/30">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Testphase aktiv
                  </span>
                )}
                {isActive && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-600/20 text-green-300 border border-green-500/30">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Aktiv
                  </span>
                )}
                {isPastDue && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-600/20 text-red-300 border border-red-500/30">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    Zahlung ausstehend
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-4xl font-bold text-white mb-1">
              {formatPrice(currentPlan.monthlyPrice)}
            </div>
            <div className="text-gray-400">
              pro Monat
            </div>
          </div>
        </div>

        {billingInfo?.trial_ends_at && isTrialing && (
          <div className="mt-6 p-4 bg-yellow-600/10 rounded-xl border border-yellow-500/30">
            <p className="text-yellow-200">
              Ihre Testphase endet am {new Date(billingInfo.trial_ends_at).toLocaleDateString('de-DE')}. 
              Upgraden Sie jetzt, um den Service weiter zu nutzen.
            </p>
          </div>
        )}
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-1 rounded-xl">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
              billingInterval === 'monthly'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Monatlich
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors ${
              billingInterval === 'yearly'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Jährlich
            <span className="ml-2 text-xs text-green-400 font-medium">
              (Sparen Sie bis zu 17%)
            </span>
          </button>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(SUBSCRIPTION_PLANS).map(([planKey, plan]) => {
          const isCurrentPlan = planKey === billingInfo?.subscription_plan
          const price = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
          const monthlyEquivalent = billingInterval === 'yearly' ? price / 12 : price
          const savings = billingInterval === 'yearly' ? calculateYearlySavings(plan.monthlyPrice, plan.yearlyPrice) : null

          return (
            <div
              key={planKey}
              className={`relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 flex flex-col ${
                (plan as any).popular
                  ? 'border-purple-500 shadow-purple-500/25'
                  : isCurrentPlan
                  ? 'border-green-500 shadow-green-500/25'
                  : 'border-gray-700/50 hover:border-gray-600'
              }`}
            >
              {(plan as any).popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                    Beliebt
                  </span>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-4 right-6">
                  <span className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                    Aktuell
                  </span>
                </div>
              )}

              <div className="p-8 h-full flex flex-col">
                {/* Header Section - Fixed Height */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2 h-8 flex items-center justify-center">
                    {plan.name}
                  </h3>
                  <p className="text-gray-400 mb-6 h-12 flex items-center justify-center">
                    {plan.description}
                  </p>
                </div>
                
                {/* Price Section - Fixed Height */}
                <div className="text-center mb-8">
                  <div className="h-20 flex flex-col justify-center">
                    <div className="text-4xl font-bold text-white mb-2">
                      {formatPrice(monthlyEquivalent)}
                    </div>
                    <div className="text-gray-400">
                      pro Standort/Monat
                    </div>
                  </div>
                  {billingInterval === 'yearly' && (
                    <div className="text-sm text-green-400 h-6">
                      Jährlich: {formatPrice(price)}
                    </div>
                  )}
                  
                  {savings && (
                    <div className="mt-3 text-sm text-green-400 font-medium h-6">
                      Sparen Sie {formatPrice(savings.amount)} ({savings.percentage}%)
                    </div>
                  )}
                </div>

                {/* Features Section - Fixed Height */}
                <div className="mb-12 flex-grow">
                  <ul className="space-y-4 h-40">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Button Section - Fixed Position */}
                <div className="mt-auto pt-8">
                  {isCurrentPlan ? (
                    <div className="w-full py-4 px-6 bg-gray-700/50 text-gray-400 text-center rounded-xl text-sm font-medium">
                      Aktueller Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(planKey)}
                      disabled={processingPlan === planKey}
                      className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                        (plan as any).popular
                          ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/25'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {processingPlan === planKey ? (
                        <div className="flex items-center justify-center">
                          <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                          Wird verarbeitet...
                        </div>
                      ) : (
                        'Auswählen'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Billing History */}
      {billingInfo?.stripe_customer_id && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-white">
              Rechnungshistorie
            </h3>
            <DocumentTextIcon className="h-6 w-6 text-gray-400" />
          </div>
          
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <h4 className="text-xl font-medium text-white mb-2">
              Keine Rechnungen gefunden
            </h4>
            <p className="text-gray-400 mb-6">
              Ihre Rechnungen werden hier angezeigt, sobald sie verfügbar sind.
            </p>
            <button
              onClick={handleManageBilling}
              className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
            >
              Rechnungen im Stripe Portal anzeigen →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}