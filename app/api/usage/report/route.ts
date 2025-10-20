// =============================================
// USAGE REPORTING API
// =============================================

import { NextRequest } from 'next/server'
import { 
  withPermission, 
  AuthenticatedRequest, 
  createApiResponse, 
  handleApiError 
} from '@/lib/api-middleware'
import { generateUsageReport } from '@/lib/usage-tracker'

// =============================================
// GENERATE USAGE REPORT
// =============================================

export async function GET(request: NextRequest) {
  return withPermission('analytics:view')(request, async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const { organizationId } = req.auth!

      // Default to current month if no dates provided
      const now = new Date()
      const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const start = startDate ? new Date(startDate) : defaultStart
      const end = endDate ? new Date(endDate) : defaultEnd

      // Validate date range
      if (start > end) {
        return createApiResponse(false, undefined, 'Start date must be before end date', 400)
      }

      // Limit report to maximum 1 year
      const maxDays = 365
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > maxDays) {
        return createApiResponse(false, undefined, `Report period cannot exceed ${maxDays} days`, 400)
      }

      const report = await generateUsageReport(organizationId, start, end)

      return createApiResponse(true, { report })

    } catch (error) {
      console.error('Usage report API error:', error)
      return handleApiError(error)
    }
  })
}