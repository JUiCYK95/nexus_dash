// =============================================
// STRIPE WEBHOOK HANDLER
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { constructWebhookEvent, getPlanFromPriceId } from '@/lib/stripe'
import Stripe from 'stripe'

// Disable body parsing for webhooks
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Get the body and signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Construct the webhook event
    let event: Stripe.Event
    try {
      event = constructWebhookEvent(body, signature)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook event: ${event.type}`)

    // Initialize Supabase client with service role key
    const supabase = createClient()

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, supabase)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// =============================================
// WEBHOOK EVENT HANDLERS
// =============================================

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  try {
    const organizationId = session.metadata?.organization_id
    if (!organizationId) {
      console.error('No organization_id in checkout session metadata')
      return
    }

    // Update organization with Stripe customer and subscription info
    const updateData: any = {
      stripe_customer_id: session.customer as string,
      subscription_status: 'active',
    }

    if (session.subscription) {
      updateData.stripe_subscription_id = session.subscription as string
    }

    const { error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)

    if (error) {
      console.error('Error updating organization after checkout:', error)
    } else {
      console.log(`Checkout completed for organization: ${organizationId}`)
    }
  } catch (error) {
    console.error('Error handling checkout completed:', error)
  }
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  supabase: any
) {
  try {
    const organizationId = subscription.metadata?.organization_id
    if (!organizationId) {
      console.error('No organization_id in subscription metadata')
      return
    }

    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price.id
    const planInfo = getPlanFromPriceId(priceId)

    if (!planInfo) {
      console.error(`Unknown price ID: ${priceId}`)
      return
    }

    // Determine subscription status
    let status = 'active'
    if (subscription.status === 'trialing') {
      status = 'trialing'
    } else if (subscription.status === 'past_due') {
      status = 'past_due'
    } else if (subscription.cancel_at_period_end) {
      status = 'canceled'
    }

    const updateData = {
      subscription_plan: planInfo.plan,
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    }

    const { error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)

    if (error) {
      console.error('Error updating organization subscription:', error)
    } else {
      console.log(`Subscription updated for organization: ${organizationId}`)
    }

    // Track the subscription change
    await trackUsageEvent(supabase, organizationId, 'subscription_changed', {
      from_plan: null, // Would need to fetch previous plan
      to_plan: planInfo.plan,
      interval: planInfo.interval,
    })

  } catch (error) {
    console.error('Error handling subscription change:', error)
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  try {
    const organizationId = subscription.metadata?.organization_id
    if (!organizationId) {
      console.error('No organization_id in subscription metadata')
      return
    }

    // Downgrade to starter plan
    const { error } = await supabase
      .from('organizations')
      .update({
        subscription_plan: 'starter',
        subscription_status: 'canceled',
        stripe_subscription_id: null,
        trial_ends_at: null,
      })
      .eq('id', organizationId)

    if (error) {
      console.error('Error handling subscription deletion:', error)
    } else {
      console.log(`Subscription canceled for organization: ${organizationId}`)
    }

    // Track the cancellation
    await trackUsageEvent(supabase, organizationId, 'subscription_canceled', {
      canceled_at: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error handling subscription deletion:', error)
  }
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  try {
    const customerId = invoice.customer as string
    
    // Get organization by customer ID
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error || !organization) {
      console.error('Organization not found for customer:', customerId)
      return
    }

    // Track successful payment
    await trackUsageEvent(supabase, organization.id, 'payment_succeeded', {
      invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
    })

    console.log(`Payment succeeded for organization: ${organization.id}`)

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  try {
    const customerId = invoice.customer as string
    
    // Get organization by customer ID
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (error || !organization) {
      console.error('Organization not found for customer:', customerId)
      return
    }

    // Update subscription status to past_due
    await supabase
      .from('organizations')
      .update({ subscription_status: 'past_due' })
      .eq('id', organization.id)

    // Track failed payment
    await trackUsageEvent(supabase, organization.id, 'payment_failed', {
      invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
    })

    console.log(`Payment failed for organization: ${organization.id}`)

  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  supabase: any
) {
  try {
    const organizationId = subscription.metadata?.organization_id
    if (!organizationId) {
      console.error('No organization_id in subscription metadata')
      return
    }

    // Track trial ending soon
    await trackUsageEvent(supabase, organizationId, 'trial_ending_soon', {
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    })

    console.log(`Trial ending soon for organization: ${organizationId}`)

    // Here you could also send an email notification to the user

  } catch (error) {
    console.error('Error handling trial will end:', error)
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

async function trackUsageEvent(
  supabase: any,
  organizationId: string,
  eventType: string,
  data: any
) {
  try {
    // You could store billing events in a separate table for audit purposes
    await supabase
      .from('billing_events')
      .insert({
        organization_id: organizationId,
        event_type: eventType,
        event_data: data,
        created_at: new Date().toISOString(),
      })
  } catch (error) {
    console.error('Error tracking usage event:', error)
  }
}