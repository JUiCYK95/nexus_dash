// =============================================
// USAGE TRACKING AND LIMITS ENFORCEMENT
// =============================================

import { createClient } from '@/lib/supabase'
import { checkUsageLimit } from '@/lib/permissions'

export interface UsageMetrics {
  messages_sent: number
  messages_received: number
  whatsapp_accounts: number
  team_members: number
  auto_replies: number
  campaigns: number
  api_calls: number
  webhook_calls: number
  file_uploads: number
  contacts_imported: number
}

export interface UsageLimits {
  [key: string]: number // -1 means unlimited
}

export interface UsageCheck {
  allowed: boolean
  used: number
  limit: number
  percentageUsed: number
  isNearLimit: boolean // > 80%
  isOverLimit: boolean
}

// =============================================
// USAGE TRACKING FUNCTIONS
// =============================================

export async function trackUsage(
  organizationId: string,
  metric: keyof UsageMetrics,
  increment: number = 1
): Promise<void> {
  try {
    const supabase = createClient()

    // Use the database function for atomic usage tracking
    const { error } = await supabase.rpc('track_usage', {
      org_id: organizationId,
      metric: metric,
      increment_by: increment
    })

    if (error) {
      console.error('Usage tracking error:', error)
    }
  } catch (error) {
    console.error('Usage tracking failed:', error)
  }
}

export async function checkUsageForMetric(
  organizationId: string,
  metric: keyof UsageMetrics
): Promise<UsageCheck> {
  try {
    const result = await checkUsageLimit(organizationId, metric)
    
    const percentageUsed = result.limit === -1 ? 0 : (result.used / result.limit) * 100
    
    return {
      allowed: result.allowed,
      used: result.used,
      limit: result.limit,
      percentageUsed,
      isNearLimit: percentageUsed > 80,
      isOverLimit: percentageUsed >= 100
    }
  } catch (error) {
    console.error('Usage check error:', error)
    return {
      allowed: false,
      used: 0,
      limit: 0,
      percentageUsed: 100,
      isNearLimit: true,
      isOverLimit: true
    }
  }
}

export async function getAllUsageMetrics(
  organizationId: string
): Promise<Record<string, UsageCheck>> {
  const metrics: (keyof UsageMetrics)[] = [
    'messages_sent',
    'messages_received', 
    'whatsapp_accounts',
    'team_members',
    'auto_replies',
    'campaigns',
    'api_calls',
    'webhook_calls',
    'file_uploads',
    'contacts_imported'
  ]

  const results: Record<string, UsageCheck> = {}

  for (const metric of metrics) {
    results[metric] = await checkUsageForMetric(organizationId, metric)
  }

  return results
}

// =============================================
// USAGE ENFORCEMENT MIDDLEWARE
// =============================================

export async function enforceUsageLimit(
  organizationId: string,
  metric: keyof UsageMetrics,
  increment: number = 1
): Promise<{ allowed: boolean; reason?: string; usageInfo?: UsageCheck }> {
  try {
    const usageCheck = await checkUsageForMetric(organizationId, metric)

    // Check if adding this increment would exceed the limit
    if (usageCheck.limit !== -1) {
      const newUsage = usageCheck.used + increment
      if (newUsage > usageCheck.limit) {
        return {
          allowed: false,
          reason: `Usage limit exceeded for ${metric}. Current: ${usageCheck.used}/${usageCheck.limit}`,
          usageInfo: usageCheck
        }
      }
    }

    return {
      allowed: true,
      usageInfo: usageCheck
    }
  } catch (error) {
    console.error('Usage enforcement error:', error)
    return {
      allowed: false,
      reason: 'Unable to check usage limits'
    }
  }
}

// =============================================
// FEATURE ACCESS FUNCTIONS
// =============================================

export async function checkFeatureLimit(
  organizationId: string,
  feature: string
): Promise<boolean> {
  try {
    const supabase = createClient()

    // Get organization's subscription plan
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('subscription_plan')
      .eq('id', organizationId)
      .single()

    if (error || !organization) {
      return false
    }

    // Get subscription plan features
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('features')
      .eq('id', organization.subscription_plan)
      .single()

    if (planError || !plan) {
      return false
    }

    const features = Array.isArray(plan.features) ? plan.features : []
    return features.includes(feature)
  } catch (error) {
    console.error('Feature access check error:', error)
    return false
  }
}

// =============================================
// USAGE ALERTS AND NOTIFICATIONS
// =============================================

export async function checkUsageAlerts(
  organizationId: string
): Promise<Array<{ metric: string; type: 'warning' | 'limit' | 'exceeded'; message: string }>> {
  const alerts: Array<{ metric: string; type: 'warning' | 'limit' | 'exceeded'; message: string }> = []
  
  try {
    const allUsage = await getAllUsageMetrics(organizationId)

    for (const [metric, usage] of Object.entries(allUsage)) {
      if (usage.limit === -1) continue // Skip unlimited metrics

      if (usage.isOverLimit) {
        alerts.push({
          metric,
          type: 'exceeded',
          message: `${metric.replace('_', ' ')} limit exceeded (${usage.used}/${usage.limit})`
        })
      } else if (usage.isNearLimit) {
        alerts.push({
          metric,
          type: 'warning',
          message: `${metric.replace('_', ' ')} usage is at ${Math.round(usage.percentageUsed)}% (${usage.used}/${usage.limit})`
        })
      } else if (usage.percentageUsed >= 100) {
        alerts.push({
          metric,
          type: 'limit',
          message: `${metric.replace('_', ' ')} limit reached (${usage.used}/${usage.limit})`
        })
      }
    }

    return alerts
  } catch (error) {
    console.error('Usage alerts check error:', error)
    return []
  }
}

// =============================================
// SUBSCRIPTION UPGRADE SUGGESTIONS
// =============================================

export async function getUpgradeSuggestions(
  organizationId: string
): Promise<Array<{ reason: string; suggestedPlan: string; benefits: string[] }>> {
  try {
    const supabase = createClient()
    const suggestions: Array<{ reason: string; suggestedPlan: string; benefits: string[] }> = []

    // Get current subscription plan
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('subscription_plan')
      .eq('id', organizationId)
      .single()

    if (error || !organization) {
      return suggestions
    }

    const currentPlan = organization.subscription_plan
    const allUsage = await getAllUsageMetrics(organizationId)

    // Check if any limits are exceeded or near limit
    const nearLimitMetrics = Object.entries(allUsage).filter(([_, usage]) => 
      usage.isNearLimit || usage.isOverLimit
    )

    if (nearLimitMetrics.length > 0) {
      const suggestedPlan = getSuggestedUpgradePlan(currentPlan)
      
      if (suggestedPlan) {
        suggestions.push({
          reason: `You're approaching limits on: ${nearLimitMetrics.map(([metric]) => metric.replace('_', ' ')).join(', ')}`,
          suggestedPlan,
          benefits: getUpgradeBenefits(currentPlan, suggestedPlan)
        })
      }
    }

    return suggestions
  } catch (error) {
    console.error('Upgrade suggestions error:', error)
    return []
  }
}

function getSuggestedUpgradePlan(currentPlan: string): string | null {
  const upgradePath: Record<string, string> = {
    'starter': 'professional',
    'professional': 'business',
    'business': 'enterprise'
  }
  
  return upgradePath[currentPlan] || null
}

function getUpgradeBenefits(currentPlan: string, targetPlan: string): string[] {
  const benefits: Record<string, string[]> = {
    'professional': [
      'Up to 10,000 messages per month',
      '3 WhatsApp accounts',
      'Advanced automation',
      'Team collaboration',
      'Priority support'
    ],
    'business': [
      'Up to 50,000 messages per month',
      '10 WhatsApp accounts',
      'Custom automation workflows',
      '24/7 phone support',
      'Advanced team features',
      'API access'
    ],
    'enterprise': [
      'Unlimited messages',
      'Unlimited WhatsApp accounts',
      'Custom enterprise features',
      'Dedicated account manager',
      'SLA guarantee',
      'White-label options'
    ]
  }

  return benefits[targetPlan] || []
}

// =============================================
// USAGE REPORTING FUNCTIONS
// =============================================

export async function generateUsageReport(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  period: { start: string; end: string }
  organization: { id: string; name: string; plan: string }
  usage: Record<string, { used: number; limit: number; percentage: number }>
  totalCost?: number
  recommendations: string[]
}> {
  try {
    const supabase = createClient()

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, subscription_plan')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      throw new Error('Organization not found')
    }

    // Get usage data for the period
    const { data: usageData, error: usageError } = await supabase
      .from('organization_usage')
      .select('metric_name, metric_value, period_start, period_end')
      .eq('organization_id', organizationId)
      .gte('period_start', startDate.toISOString())
      .lte('period_end', endDate.toISOString())

    if (usageError) {
      console.error('Usage data error:', usageError)
    }

    // Get subscription plan limits
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('limits')
      .eq('id', organization.subscription_plan)
      .single()

    const limits = plan?.limits as Record<string, number> || {}

    // Aggregate usage data
    const usage: Record<string, { used: number; limit: number; percentage: number }> = {}
    
    if (usageData) {
      for (const record of usageData) {
        const metric = record.metric_name
        const used = record.metric_value
        const limit = limits[metric] || 0

        if (!usage[metric]) {
          usage[metric] = { used: 0, limit, percentage: 0 }
        }
        
        usage[metric].used += used
        usage[metric].percentage = limit === -1 ? 0 : (usage[metric].used / limit) * 100
      }
    }

    // Generate recommendations
    const recommendations: string[] = []
    for (const [metric, data] of Object.entries(usage)) {
      if (data.percentage > 80) {
        recommendations.push(`Consider upgrading to increase ${metric.replace('_', ' ')} limit`)
      }
    }

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      organization: {
        id: organizationId,
        name: organization.name,
        plan: organization.subscription_plan
      },
      usage,
      recommendations
    }
  } catch (error) {
    console.error('Usage report generation error:', error)
    throw error
  }
}