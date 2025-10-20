// =============================================
// STRIPE CONFIGURATION
// =============================================

import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe instance (only initialize on server)
export const stripe = typeof window === 'undefined' ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
  appInfo: {
    name: 'WhatsApp SaaS Bot',
    version: '1.0.0',
  },
}) : null

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null>
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// =============================================
// STRIPE PRICE MAPPING
// =============================================

export const STRIPE_PLANS = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID!,
  },
  professional: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID!,
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!,
    yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID!,
  },
} as const

// =============================================
// STRIPE UTILITIES
// =============================================

export async function createStripeCustomer({
  email,
  name,
  organizationId,
}: {
  email: string
  name: string
  organizationId: string
}) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organization_id: organizationId,
      },
    })

    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}

export async function createCheckoutSession({
  customerId,
  priceId,
  organizationId,
  successUrl,
  cancelUrl,
  trialDays = 0,
}: {
  customerId: string
  priceId: string
  organizationId: string
  successUrl: string
  cancelUrl: string
  trialDays?: number
}) {
  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organization_id: organizationId,
      },
      subscription_data: {
        metadata: {
          organization_id: organizationId,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
    }

    // Add trial if specified
    if (trialDays > 0) {
      sessionParams.subscription_data!.trial_period_days = trialDays
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    throw error
  }
}

export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'customer'],
    })
    return subscription
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    throw error
  }
}

export async function cancelSubscription(subscriptionId: string, immediately = false) {
  try {
    if (immediately) {
      const subscription = await stripe.subscriptions.cancel(subscriptionId)
      return subscription
    } else {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
      return subscription
    }
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

export async function updateSubscription({
  subscriptionId,
  newPriceId,
}: {
  subscriptionId: string
  newPriceId: string
}) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'immediate_proration',
    })

    return updatedSubscription
  } catch (error) {
    console.error('Error updating subscription:', error)
    throw error
  }
}

export async function getCustomerInvoices(customerId: string, limit = 10) {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    })
    return invoices
  } catch (error) {
    console.error('Error retrieving invoices:', error)
    throw error
  }
}

export async function getUsageRecords({
  subscriptionItemId,
  startDate,
  endDate,
}: {
  subscriptionItemId: string
  startDate: Date
  endDate: Date
}) {
  try {
    const usageRecords = await stripe.subscriptionItems.listUsageRecordSummaries(
      subscriptionItemId,
      {
        timestamp: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
      }
    )
    return usageRecords
  } catch (error) {
    console.error('Error retrieving usage records:', error)
    throw error
  }
}

// =============================================
// WEBHOOK HELPERS
// =============================================

export function constructWebhookEvent(body: string, signature: string) {
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    return event
  } catch (error) {
    console.error('Error constructing webhook event:', error)
    throw error
  }
}

// =============================================
// PLAN UTILITIES
// =============================================

export function getPriceIdFromPlan(
  plan: keyof typeof STRIPE_PLANS,
  interval: 'monthly' | 'yearly'
): string {
  return STRIPE_PLANS[plan][interval]
}

export function getPlanFromPriceId(priceId: string): {
  plan: keyof typeof STRIPE_PLANS
  interval: 'monthly' | 'yearly'
} | null {
  for (const [planKey, planPrices] of Object.entries(STRIPE_PLANS)) {
    if (planPrices.monthly === priceId) {
      return { plan: planKey as keyof typeof STRIPE_PLANS, interval: 'monthly' }
    }
    if (planPrices.yearly === priceId) {
      return { plan: planKey as keyof typeof STRIPE_PLANS, interval: 'yearly' }
    }
  }
  return null
}

export function formatPrice(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount / 100)
}

export function calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): {
  amount: number
  percentage: number
} {
  const yearlyEquivalent = monthlyPrice * 12
  const savings = yearlyEquivalent - yearlyPrice
  const percentage = Math.round((savings / yearlyEquivalent) * 100)
  
  return {
    amount: savings,
    percentage,
  }
}

// =============================================
// ERROR HANDLING
// =============================================

export class StripeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'StripeError'
  }
}

export function handleStripeError(error: any): StripeError {
  if (error.type === 'StripeCardError') {
    return new StripeError(
      'Ihre Karte wurde abgelehnt. Bitte versuchen Sie eine andere Zahlungsmethode.',
      error.code,
      400
    )
  }
  
  if (error.type === 'StripeInvalidRequestError') {
    return new StripeError(
      'Ungültige Anfrage. Bitte kontaktieren Sie den Support.',
      error.code,
      400
    )
  }
  
  if (error.type === 'StripeAPIError') {
    return new StripeError(
      'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
      error.code,
      500
    )
  }
  
  return new StripeError(
    'Ein unbekannter Fehler ist aufgetreten.',
    'unknown',
    500
  )
}