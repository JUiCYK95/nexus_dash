// =============================================
// PERMISSIONS AND ROLE-BASED ACCESS CONTROL
// =============================================

import { createClient } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { MemberRole, MemberPermissions, DEFAULT_PERMISSIONS } from '@/types/tenant'
import { randomBytes } from 'crypto'

type Permission = keyof MemberPermissions

export interface PermissionCheck {
  hasPermission: boolean
  role?: MemberRole
  organizationId?: string
  error?: string
}

export interface AuthContext {
  userId: string
  organizationId: string
  role: MemberRole
  permissions: Permission[]
}

// =============================================
// PERMISSION CHECKER FUNCTIONS
// =============================================

export async function checkUserPermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<PermissionCheck> {
  try {
    const supabase = createClient()

    // Get user's role in the organization
    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (error || !membership) {
      return {
        hasPermission: false,
        error: 'User is not a member of this organization'
      }
    }

    const role = membership.role as MemberRole
    const rolePermissions = DEFAULT_PERMISSIONS[role] || {}

    // Check if the specific permission is granted
    const hasPermission = rolePermissions[permission] === true

    return {
      hasPermission,
      role,
      organizationId,
    }
  } catch (error) {
    console.error('Permission check error:', error)
    return {
      hasPermission: false,
      error: 'Failed to check permissions'
    }
  }
}

export async function getUserAuthContext(
  userId: string,
  organizationId: string,
  request?: any
): Promise<AuthContext | null> {
  try {
    // Use server client if request is provided (server-side), otherwise use regular client (client-side)
    const supabase = request ? createServerSupabaseClient(request) : createClient()

    const { data: membership, error } = await supabase
      .from('organization_members')
      .select('role, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (error || !membership) {
      console.error('getUserAuthContext error:', { error, userId, organizationId })
      return null
    }

    const role = membership.role as MemberRole
    const rolePermissions = DEFAULT_PERMISSIONS[role] || {}

    // Convert permissions object to array of permission keys where value is true
    const permissions = Object.entries(rolePermissions)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key as Permission)

    console.log('✅ Auth context created:', { userId, organizationId, role, permissionsCount: permissions.length })

    return {
      userId,
      organizationId,
      role,
      permissions,
    }
  } catch (error) {
    console.error('Auth context error:', error)
    return null
  }
}

export async function checkMultiplePermissions(
  userId: string,
  organizationId: string,
  permissions: Permission[]
): Promise<PermissionCheck> {
  try {
    const authContext = await getUserAuthContext(userId, organizationId)

    if (!authContext) {
      return {
        hasPermission: false,
        error: 'User is not a member of this organization'
      }
    }

    const hasAllPermissions = permissions.every(permission =>
      authContext.permissions.includes(permission)
    )

    return {
      hasPermission: hasAllPermissions,
      role: authContext.role,
      organizationId,
    }
  } catch (error) {
    console.error('Multiple permissions check error:', error)
    return {
      hasPermission: false,
      error: 'Failed to check permissions'
    }
  }
}

// =============================================
// ROLE HIERARCHY FUNCTIONS
// =============================================

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
}

export function hasHigherRole(userRole: MemberRole, requiredRole: MemberRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function canManageRole(managerRole: MemberRole, targetRole: MemberRole): boolean {
  // Owners can manage any role
  if (managerRole === 'owner') return true
  
  // Admins can manage members and viewers, but not other admins or owners
  if (managerRole === 'admin') {
    return ['member', 'viewer'].includes(targetRole)
  }
  
  // Members and viewers cannot manage roles
  return false
}

// =============================================
// ORGANIZATION ACCESS FUNCTIONS
// =============================================

export async function getUserOrganizations(userId: string) {
  try {
    const supabase = createClient()

    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        is_active,
        joined_at,
        organization:organizations (
          id,
          name,
          slug,
          subscription_plan,
          subscription_status,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching user organizations:', error)
      return []
    }

    return memberships.map(membership => ({
      ...membership.organization,
      role: membership.role,
      joinedAt: membership.joined_at,
    }))
  } catch (error) {
    console.error('User organizations error:', error)
    return []
  }
}

export async function getDefaultOrganization(userId: string) {
  try {
    const organizations = await getUserOrganizations(userId)
    
    // Return the first organization (most recently joined) or the one where user is owner
    const ownerOrg = organizations.find(org => org.role === 'owner')
    return ownerOrg || organizations[0] || null
  } catch (error) {
    console.error('Default organization error:', error)
    return null
  }
}

// =============================================
// FEATURE ACCESS FUNCTIONS
// =============================================

export async function checkFeatureAccess(
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

export async function checkUsageLimit(
  organizationId: string,
  metric: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  try {
    const supabase = createClient()

    // Get organization's subscription plan
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('subscription_plan')
      .eq('id', organizationId)
      .single()

    if (error || !organization) {
      return { allowed: false, used: 0, limit: 0 }
    }

    // Get subscription plan limits
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('limits')
      .eq('id', organization.subscription_plan)
      .single()

    if (planError || !plan) {
      return { allowed: false, used: 0, limit: 0 }
    }

    const limits = plan.limits as Record<string, number>
    const limit = limits[metric] || 0

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, used: 0, limit: -1 }
    }

    // Get current usage for this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: usage, error: usageError } = await supabase
      .from('organization_usage')
      .select('metric_value')
      .eq('organization_id', organizationId)
      .eq('metric_name', metric)
      .gte('period_start', startOfMonth.toISOString())
      .single()

    const currentUsage = usage?.metric_value || 0

    return {
      allowed: currentUsage < limit,
      used: currentUsage,
      limit,
    }
  } catch (error) {
    console.error('Usage limit check error:', error)
    return { allowed: false, used: 0, limit: 0 }
  }
}

// =============================================
// INVITATION FUNCTIONS
// =============================================

export async function createInvitation(
  organizationId: string,
  inviterUserId: string,
  email: string,
  role: MemberRole
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if inviter has permission to invite
    const canInvite = await checkUserPermission(inviterUserId, organizationId, 'team:manage')
    
    if (!canInvite.hasPermission) {
      return { success: false, error: 'No permission to invite users' }
    }

    // Check if inviter can assign this role
    if (!canManageRole(canInvite.role!, role)) {
      return { success: false, error: 'Cannot assign this role' }
    }

    const supabase = createClient()

    // Create invitation record
    const { error } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: inviterUserId,
        token: generateInvitationToken(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })

    if (error) {
      console.error('Create invitation error:', error)
      return { success: false, error: 'Failed to create invitation' }
    }

    // TODO: Send invitation email

    return { success: true }
  } catch (error) {
    console.error('Invitation error:', error)
    return { success: false, error: 'Failed to create invitation' }
  }
}

function generateInvitationToken(): string {
  // Generate cryptographically secure random token (32 bytes = 64 hex characters)
  return randomBytes(32).toString('hex')
}

// =============================================
// AUDIT LOG FUNCTIONS
// =============================================

export async function logAuditEvent(
  organizationId: string,
  userId: string,
  action: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const supabase = createClient()

    await supabase
      .from('audit_logs')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        action,
        details,
        created_at: new Date().toISOString(),
      })
  } catch (error) {
    console.error('Audit log error:', error)
    // Don't throw error for audit logging failures
  }
}