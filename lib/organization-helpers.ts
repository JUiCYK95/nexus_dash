import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from './supabase-server'

/**
 * Get the current organization membership for a user
 * Handles users with multiple organization memberships by:
 * 1. Checking for x-organization-id header (set by frontend from localStorage)
 * 2. Falling back to the first active membership
 */
export async function getCurrentOrganizationMembership(request: NextRequest) {
  const supabase = createServerSupabaseClient(request)

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, membership: null, error: 'Unauthorized' }
  }

  // Get current organization ID from header (set by frontend from localStorage)
  const currentOrgId = request.headers.get('x-organization-id')
  console.log('📥 Backend received org ID from header:', currentOrgId)

  // Get user's organization memberships
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id, role, is_active, organization:organizations(id, name, slug, subscription_plan)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (!memberships || memberships.length === 0 || memberError) {
    return { user, membership: null, error: 'No organization membership found' }
  }

  // Find the membership to use:
  // 1. If organization ID is in header, use that
  // 2. Otherwise use the first membership
  let membership = currentOrgId
    ? memberships.find(m => m.organization_id === currentOrgId)
    : memberships[0]

  // Fallback to first membership if specified org not found
  if (!membership) {
    membership = memberships[0]
  }

  return { user, membership, error: null }
}
