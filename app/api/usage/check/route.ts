// =============================================
// USAGE CHECK API
// =============================================

import { NextRequest } from 'next/server'
import { 
  withPermission, 
  AuthenticatedRequest, 
  createApiResponse, 
  handleApiError 
} from '@/lib/api-middleware'
import { 
  checkUsageForMetric, 
  getAllUsageMetrics, 
  checkUsageAlerts,
  getUpgradeSuggestions,
  UsageMetrics 
} from '@/lib/usage-tracker'

// =============================================
// GET USAGE INFORMATION
// =============================================

export async function GET(request: NextRequest) {
  return withPermission('analytics:view')(request, async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const metric = searchParams.get('metric') as keyof UsageMetrics
      const { organizationId } = req.auth!

      if (metric) {
        // Get specific metric usage
        const usageCheck = await checkUsageForMetric(organizationId, metric)
        return createApiResponse(true, { metric, usage: usageCheck })
      } else {
        // Get all usage metrics
        const allUsage = await getAllUsageMetrics(organizationId)
        const alerts = await checkUsageAlerts(organizationId)
        const suggestions = await getUpgradeSuggestions(organizationId)

        return createApiResponse(true, {
          usage: allUsage,
          alerts,
          suggestions
        })
      }

    } catch (error) {
      console.error('Usage check API error:', error)
      return handleApiError(error)
    }
  })
}