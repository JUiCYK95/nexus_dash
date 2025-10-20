// =============================================
// CLIENT-SIDE STRIPE UTILITIES
// =============================================

import { loadStripe } from '@stripe/stripe-js'

// Client-side Stripe instance
let stripePromise: Promise<any>
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// Client-side utility functions
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

// Redirect to Stripe Checkout
export async function redirectToCheckout(sessionId: string) {
  const stripe = await getStripe()
  if (!stripe) {
    throw new Error('Stripe not loaded')
  }

  const { error } = await stripe.redirectToCheckout({ sessionId })
  
  if (error) {
    console.error('Stripe checkout error:', error)
    throw error
  }
}