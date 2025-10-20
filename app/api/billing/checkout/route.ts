// =============================================
// STRIPE CHECKOUT SESSION API
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { 
  createCheckoutSession, 
  createStripeCustomer, 
  getPriceIdFromPlan,
  handleStripeError 
} from '@/lib/stripe'
import { withPermission, AuthenticatedRequest, createApiResponse, handleApiError } from '@/lib/api-middleware'
import { SubscriptionPlan } from '@/types/tenant'

export async function POST(request: NextRequest) {
  return withPermission('manage_billing')(request, async (req: AuthenticatedRequest) => {
    try {
      const { plan, interval, organizationId } = await request.json()

      // Validate input
      if (!plan || !interval || !organizationId) {
        return createApiResponse(false, undefined, 'Missing required fields', 400)
      }

      // Verify organizationId matches auth context
      if (req.auth!.organizationId !== organizationId) {
        return createApiResponse(false, undefined, 'Organization ID mismatch', 403)
      }

      const supabase = createClient()

      // Get organization details
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()

      if (orgError || !organization) {
        return createApiResponse(false, undefined, 'Organization not found', 404)
      }

      // Get Stripe price ID
      const priceId = getPriceIdFromPlan(plan as SubscriptionPlan, interval)
      if (!priceId) {
        return createApiResponse(false, undefined, 'Invalid plan or interval', 400)
      }

      // Create or get Stripe customer
      let customerId = organization.stripe_customer_id

      if (!customerId) {
        // Get user email from auth context
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) {
          return createApiResponse(false, undefined, 'User email not found', 400)
        }

        const customer = await createStripeCustomer({
          email: user.email,
          name: organization.name,
          organizationId: organization.id,
        })

        customerId = customer.id

        // Update organization with Stripe customer ID
        await supabase
          .from('organizations')
          .update({ stripe_customer_id: customerId })
          .eq('id', organizationId)
      }

      // Create checkout session
      const session = await createCheckoutSession({
        customerId,
        priceId,
        organizationId,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
        trialDays: organization.subscription_status === 'trialing' ? 0 : 14, // 14 days trial for new customers
      })

      return createApiResponse(true, {
        sessionId: session.id,
        url: session.url,
      })

    } catch (error: any) {
      console.error('Checkout error:', error)
      return handleApiError(error)
    }
  })
}

// =============================================
// GET CHECKOUT SESSION STATUS
// =============================================

export async function GET(request: NextRequest) {
  return withPermission('manage_billing')(request, async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const sessionId = searchParams.get('session_id')

      if (!sessionId) {
        return createApiResponse(false, undefined, 'Session ID required', 400)
      }

      // Import stripe here to avoid loading it on client
      const { stripe } = await import('@/lib/stripe')
      
      if (!stripe) {
        throw new Error('Stripe not initialized')
      }
      
      // Retrieve checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      })

      // Verify the session belongs to user's organization
      const organizationId = session.metadata?.organization_id
      if (!organizationId || organizationId !== req.auth!.organizationId) {
        return createApiResponse(false, undefined, 'Invalid session or access denied', 403)
      }

      return createApiResponse(true, {
        status: session.payment_status,
        subscription: session.subscription,
        customer_email: session.customer_details?.email,
      })

    } catch (error: any) {
      console.error('Checkout status error:', error)
      return handleApiError(error)
    }
  })
}