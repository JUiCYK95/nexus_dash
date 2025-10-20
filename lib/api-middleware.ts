// =============================================
// API MIDDLEWARE FOR AUTHENTICATION & AUTHORIZATION
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkUserPermission, getUserAuthContext, logAuditEvent } from '@/lib/permissions'
import { MemberPermissions } from '@/types/tenant'

type Permission = keyof MemberPermissions

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface AuthenticatedRequest extends NextRequest {
  auth?: {
    userId: string
    organizationId: string
    role: string
    permissions: Permission[]
  }
}

// =============================================
// AUTHENTICATION MIDDLEWARE
// =============================================

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const supabase = createServerSupabaseClient(request)

    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Extract organization ID from request
    const organizationId = await extractOrganizationId(request, supabase, user.id)

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 400 }
      )
    }

    // Get user's auth context for this organization
    const authContext = await getUserAuthContext(user.id, organizationId)

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Access denied to organization' },
        { status: 403 }
      )
    }

    // Add auth context to request
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.auth = authContext

    return await handler(authenticatedRequest)
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// =============================================
// AUTHORIZATION MIDDLEWARE
// =============================================

export function withPermission(permission: Permission) {
  return async function(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req: AuthenticatedRequest) => {
      if (!req.auth) {
        return NextResponse.json(
          { success: false, error: 'Authentication context missing' },
          { status: 500 }
        )
      }

      const { userId, organizationId, permissions } = req.auth

      // Check if user has the required permission
      if (!permissions.includes(permission)) {
        // Log unauthorized access attempt
        await logAuditEvent(
          organizationId,
          userId,
          'unauthorized_access_attempt',
          { 
            requiredPermission: permission,
            userPermissions: permissions,
            endpoint: req.url
          }
        )

        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      return await handler(req)
    })
  }
}

export function withMultiplePermissions(permissions: Permission[]) {
  return async function(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req: AuthenticatedRequest) => {
      if (!req.auth) {
        return NextResponse.json(
          { success: false, error: 'Authentication context missing' },
          { status: 500 }
        )
      }

      const { userId, organizationId, permissions: userPermissions } = req.auth

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every(permission =>
        userPermissions.includes(permission)
      )

      if (!hasAllPermissions) {
        await logAuditEvent(
          organizationId,
          userId,
          'unauthorized_access_attempt',
          { 
            requiredPermissions: permissions,
            userPermissions,
            endpoint: req.url
          }
        )

        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        )
      }

      return await handler(req)
    })
  }
}

// =============================================
// ROLE-BASED MIDDLEWARE
// =============================================

export function withRole(minRole: 'viewer' | 'member' | 'admin' | 'owner') {
  const roleHierarchy = { viewer: 1, member: 2, admin: 3, owner: 4 }
  
  return async function(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req: AuthenticatedRequest) => {
      if (!req.auth) {
        return NextResponse.json(
          { success: false, error: 'Authentication context missing' },
          { status: 500 }
        )
      }

      const { userId, organizationId, role } = req.auth
      const userRoleLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0
      const requiredRoleLevel = roleHierarchy[minRole]

      if (userRoleLevel < requiredRoleLevel) {
        await logAuditEvent(
          organizationId,
          userId,
          'unauthorized_role_access_attempt',
          { 
            userRole: role,
            requiredRole: minRole,
            endpoint: req.url
          }
        )

        return NextResponse.json(
          { success: false, error: `Role '${minRole}' or higher required` },
          { status: 403 }
        )
      }

      return await handler(req)
    })
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

async function extractOrganizationId(
  request: NextRequest,
  supabase: any,
  userId: string
): Promise<string | null> {
  // Try to get organization ID from various sources

  // 1. From URL parameters
  const url = new URL(request.url)
  const orgIdFromParams = url.searchParams.get('organizationId') ||
                         url.searchParams.get('org_id') ||
                         url.searchParams.get('organization_id')

  if (orgIdFromParams) {
    return orgIdFromParams
  }

  // 2. From path segments (e.g., /api/organizations/{id}/...)
  const pathSegments = url.pathname.split('/')
  const orgIndex = pathSegments.findIndex(segment =>
    segment === 'organizations' || segment === 'org'
  )

  if (orgIndex !== -1 && pathSegments[orgIndex + 1]) {
    return pathSegments[orgIndex + 1]
  }

  // 3. From custom header
  const orgIdFromHeader = request.headers.get('x-organization-id')
  if (orgIdFromHeader) {
    return orgIdFromHeader
  }

  // 4. From request body (POST/PUT requests) - clone request to read body
  if (request.method !== 'GET' && request.headers.get('content-type')?.includes('application/json')) {
    try {
      const clonedRequest = request.clone()
      const body = await clonedRequest.json()

      if (body.organizationId) {
        return body.organizationId
      }
      if (body.organization_id) {
        return body.organization_id
      }
    } catch (error) {
      // Body parsing failed, continue with other methods
    }
  }

  // 5. If no organization ID found, try to get user's default organization
  try {
    // Get user's first active organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single()

    if (membershipError || !membership) {
      console.error('Error getting user organization:', membershipError)
      return null
    }

    return membership.organization_id
  } catch (error) {
    console.error('Error extracting organization ID:', error)
    return null
  }
}

// =============================================
// ERROR HANDLING UTILITIES
// =============================================

export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  statusCode: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    statusCode,
  }

  return NextResponse.json(response, { status: statusCode })
}

export function handleApiError(error: any): NextResponse {
  console.error('API Error:', error)

  if (error.message?.includes('permission')) {
    return createApiResponse(false, undefined, 'Permission denied', 403)
  }

  if (error.message?.includes('not found')) {
    return createApiResponse(false, undefined, 'Resource not found', 404)
  }

  if (error.message?.includes('validation')) {
    return createApiResponse(false, undefined, error.message, 400)
  }

  return createApiResponse(false, undefined, 'Internal server error', 500)
}

// =============================================
// USAGE TRACKING MIDDLEWARE
// =============================================

export function withUsageTracking(metric: string) {
  return async function(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req: AuthenticatedRequest) => {
      if (!req.auth) {
        return NextResponse.json(
          { success: false, error: 'Authentication context missing' },
          { status: 500 }
        )
      }

      const { organizationId } = req.auth

      // Execute the handler first
      const response = await handler(req)

      // Track usage only if the request was successful
      if (response.status >= 200 && response.status < 300) {
        try {
          const supabase = createClient()
          
          // Call the track_usage function
          await supabase.rpc('track_usage', {
            org_id: organizationId,
            metric,
            increment_by: 1
          })
        } catch (error) {
          console.error('Usage tracking error:', error)
          // Don't fail the request if usage tracking fails
        }
      }

      return response
    })
  }
}

// =============================================
// RATE LIMITING MIDDLEWARE
// =============================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function withRateLimit(maxRequests: number, windowMs: number) {
  return async function(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withAuth(request, async (req: AuthenticatedRequest) => {
      if (!req.auth) {
        return NextResponse.json(
          { success: false, error: 'Authentication context missing' },
          { status: 500 }
        )
      }

      const { userId, organizationId } = req.auth
      const key = `${organizationId}:${userId}`
      const now = Date.now()

      // Get or create rate limit entry
      let rateLimit = rateLimitStore.get(key)
      
      if (!rateLimit || now > rateLimit.resetTime) {
        rateLimit = { count: 0, resetTime: now + windowMs }
        rateLimitStore.set(key, rateLimit)
      }

      // Check if rate limit exceeded
      if (rateLimit.count >= maxRequests) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((rateLimit.resetTime - now) / 1000).toString()
            }
          }
        )
      }

      // Increment rate limit counter
      rateLimit.count++

      return await handler(req)
    })
  }
}

// =============================================
// COMPOSITE MIDDLEWARE
// =============================================

export function withApiProtection({
  permission,
  role,
  usageMetric,
  rateLimit,
}: {
  permission?: Permission
  role?: 'viewer' | 'member' | 'admin' | 'owner'
  usageMetric?: string
  rateLimit?: { maxRequests: number; windowMs: number }
} = {}) {
  return async function(
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    let middleware = withAuth

    if (permission) {
      middleware = withPermission(permission)
    } else if (role) {
      middleware = withRole(role)
    }

    if (rateLimit) {
      const rateLimitMiddleware = withRateLimit(rateLimit.maxRequests, rateLimit.windowMs)
      const originalMiddleware = middleware
      middleware = async (req, handler) => 
        rateLimitMiddleware(req, (req) => originalMiddleware(req, handler))
    }

    if (usageMetric) {
      const usageMiddleware = withUsageTracking(usageMetric)
      const originalMiddleware = middleware
      middleware = async (req, handler) => 
        usageMiddleware(req, (req) => originalMiddleware(req, handler))
    }

    return middleware(request, handler)
  }
}