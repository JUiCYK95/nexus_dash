// =============================================
// TEAM MEMBERS MANAGEMENT API
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  withPermission,
  withMultiplePermissions,
  AuthenticatedRequest,
  createApiResponse,
  handleApiError
} from '@/lib/api-middleware'
import { logAuditEvent, canManageRole } from '@/lib/permissions'
import { MemberRole } from '@/types/tenant'

// =============================================
// GET TEAM MEMBERS
// =============================================

export async function GET(request: NextRequest) {
  return withPermission('manage_members')(request, async (req: AuthenticatedRequest) => {
    try {
      const supabase = createServerSupabaseClient(request)
      const { organizationId } = req.auth!

      // Get team members with user info from public.users
      const { data: members, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          is_active,
          permissions
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })

      if (error) {
        console.error('Error fetching team members:', error)
        return createApiResponse(false, undefined, 'Failed to fetch team members', 500)
      }

      // Get auth user data for all team members
      const userIds = members?.map(m => m.user_id) || []
      const formattedMembers: any[] = []

      for (const member of members || []) {
        try {
          // Get user data from auth.users using admin client
          const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(member.user_id)

          let email = 'Unknown'
          let name = 'Unknown'

          if (authUser && !authError) {
            email = authUser.email || 'Unknown'

            // Try to get name from both user_metadata and raw_user_meta_data
            const metadata = authUser.user_metadata || {}
            const rawMetadata = (authUser as any).raw_user_meta_data || {}

            // Try multiple metadata fields for the name
            name = metadata.full_name ||
                   metadata.name ||
                   metadata.display_name ||
                   rawMetadata.full_name ||
                   rawMetadata.name ||
                   rawMetadata.display_name ||
                   email.split('@')[0]
          } else {
            console.error(`Error fetching user ${member.user_id}:`, authError)
          }

          formattedMembers.push({
            id: member.id,
            userId: member.user_id,
            email,
            name,
            role: member.role,
            joinedAt: member.joined_at,
            isActive: member.is_active,
          })
        } catch (error) {
          console.error(`Failed to fetch user ${member.user_id}:`, error)
          // Add member with unknown data
          formattedMembers.push({
            id: member.id,
            userId: member.user_id,
            email: 'Unknown',
            name: 'Unknown',
            role: member.role,
            joinedAt: member.joined_at,
            isActive: member.is_active,
          })
        }
      }

      return createApiResponse(true, { members: formattedMembers })

    } catch (error) {
      console.error('Team members API error:', error)
      return handleApiError(error)
    }
  })
}

// =============================================
// INVITE TEAM MEMBER
// =============================================

export async function POST(request: NextRequest) {
  return withPermission('manage_members')(request, async (req: AuthenticatedRequest) => {
    try {
      const { email, role } = await request.json()
      const { userId, organizationId } = req.auth!

      // Validate input
      if (!email || !role) {
        return createApiResponse(false, undefined, 'Email and role are required', 400)
      }

      if (!['viewer', 'member', 'admin'].includes(role)) {
        return createApiResponse(false, undefined, 'Invalid role', 400)
      }

      const supabase = createServerSupabaseClient(request)

      // Get current user's role to check if they can assign this role
      const { data: currentMember, error: memberError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (memberError || !currentMember) {
        return createApiResponse(false, undefined, 'Current user membership not found', 403)
      }

      // Check if current user can manage this role
      if (!canManageRole(currentMember.role as MemberRole, role as MemberRole)) {
        await logAuditEvent(organizationId, userId, 'unauthorized_role_assignment_attempt', {
          targetRole: role,
          userRole: currentMember.role,
          targetEmail: email
        })

        return createApiResponse(false, undefined, 'Cannot assign this role', 403)
      }

      // Check if user with this email already exists in the organization
      const { data: existingUser } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('organization_members')
          .select('id, is_active')
          .eq('organization_id', organizationId)
          .eq('user_id', existingUser.id)
          .single()

        if (existingMember) {
          if (existingMember.is_active) {
            return createApiResponse(false, undefined, 'User is already a member of this organization', 400)
          } else {
            // Reactivate inactive member
            await supabase
              .from('organization_members')
              .update({ 
                is_active: true, 
                role,
                joined_at: new Date().toISOString()
              })
              .eq('id', existingMember.id)

            await logAuditEvent(organizationId, userId, 'member_reactivated', {
              targetUserId: existingUser.id,
              targetEmail: email,
              newRole: role
            })

            return createApiResponse(true, { message: 'User reactivated successfully' })
          }
        }
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabase
        .from('organization_invitations')
        .select('id, expires_at')
        .eq('organization_id', organizationId)
        .eq('email', email)
        .is('accepted_at', null)
        .single()

      if (existingInvitation) {
        const now = new Date()
        const expiresAt = new Date(existingInvitation.expires_at)

        if (expiresAt > now) {
          return createApiResponse(false, undefined, 'Invitation already sent and still valid', 400)
        } else {
          // Delete expired invitation
          await supabase
            .from('organization_invitations')
            .delete()
            .eq('id', existingInvitation.id)
        }
      }

      // Generate invitation token
      const token = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15)

      // Create invitation
      const { error: inviteError } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: organizationId,
          email,
          role,
          invited_by: userId,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })

      if (inviteError) {
        console.error('Error creating invitation:', inviteError)
        return createApiResponse(false, undefined, 'Failed to create invitation', 500)
      }

      // Log audit event
      await logAuditEvent(organizationId, userId, 'member_invited', {
        targetEmail: email,
        role,
        invitationToken: token
      })

      // TODO: Send invitation email

      return createApiResponse(true, { 
        message: 'Invitation sent successfully',
        invitationToken: token // Remove in production, only for testing
      })

    } catch (error) {
      console.error('Invite member API error:', error)
      return handleApiError(error)
    }
  })
}

// =============================================
// UPDATE TEAM MEMBER ROLE
// =============================================

export async function PUT(request: NextRequest) {
  return withPermission('manage_members')(request, async (req: AuthenticatedRequest) => {
    try {
      const { memberId, newRole } = await request.json()
      const { userId, organizationId, role: currentUserRole } = req.auth!

      // Validate input
      if (!memberId || !newRole) {
        return createApiResponse(false, undefined, 'Member ID and new role are required', 400)
      }

      if (!['viewer', 'member', 'admin'].includes(newRole)) {
        return createApiResponse(false, undefined, 'Invalid role', 400)
      }

      const supabase = createServerSupabaseClient(request)

      // Get target member details
      const { data: targetMember, error: memberError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      if (memberError || !targetMember) {
        return createApiResponse(false, undefined, 'Member not found', 404)
      }

      // Prevent self-role changes
      if (targetMember.user_id === userId) {
        return createApiResponse(false, undefined, 'Cannot change your own role', 400)
      }

      // Check if current user can manage both the old and new role
      if (!canManageRole(currentUserRole as MemberRole, targetMember.role as MemberRole) ||
          !canManageRole(currentUserRole as MemberRole, newRole as MemberRole)) {
        await logAuditEvent(organizationId, userId, 'unauthorized_role_change_attempt', {
          targetMemberId: memberId,
          currentRole: targetMember.role,
          newRole,
          userRole: currentUserRole
        })

        return createApiResponse(false, undefined, 'Cannot manage this role change', 403)
      }

      // Update member role
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (updateError) {
        console.error('Error updating member role:', updateError)
        return createApiResponse(false, undefined, 'Failed to update member role', 500)
      }

      // Log audit event
      await logAuditEvent(organizationId, userId, 'member_role_changed', {
        targetMemberId: memberId,
        targetUserId: targetMember.user_id,
        targetEmail: `user${targetMember.user_id}@example.com`,
        oldRole: targetMember.role,
        newRole
      })

      return createApiResponse(true, { message: 'Member role updated successfully' })

    } catch (error) {
      console.error('Update member role API error:', error)
      return handleApiError(error)
    }
  })
}

// =============================================
// REMOVE TEAM MEMBER
// =============================================

export async function DELETE(request: NextRequest) {
  return withPermission('manage_members')(request, async (req: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const memberId = searchParams.get('memberId')
      const { userId, organizationId, role: currentUserRole } = req.auth!

      if (!memberId) {
        return createApiResponse(false, undefined, 'Member ID is required', 400)
      }

      const supabase = createServerSupabaseClient(request)

      // Get target member details
      const { data: targetMember, error: memberError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      if (memberError || !targetMember) {
        return createApiResponse(false, undefined, 'Member not found', 404)
      }

      // Prevent self-removal
      if (targetMember.user_id === userId) {
        return createApiResponse(false, undefined, 'Cannot remove yourself', 400)
      }

      // Check if current user can manage this role
      if (!canManageRole(currentUserRole as MemberRole, targetMember.role as MemberRole)) {
        await logAuditEvent(organizationId, userId, 'unauthorized_member_removal_attempt', {
          targetMemberId: memberId,
          targetRole: targetMember.role,
          userRole: currentUserRole
        })

        return createApiResponse(false, undefined, 'Cannot remove this member', 403)
      }

      // Deactivate member instead of deleting (for audit purposes)
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ is_active: false })
        .eq('id', memberId)

      if (updateError) {
        console.error('Error removing member:', updateError)
        return createApiResponse(false, undefined, 'Failed to remove member', 500)
      }

      // Log audit event
      await logAuditEvent(organizationId, userId, 'member_removed', {
        targetMemberId: memberId,
        targetUserId: targetMember.user_id,
        targetEmail: `user${targetMember.user_id}@example.com`,
        targetRole: targetMember.role
      })

      return createApiResponse(true, { message: 'Member removed successfully' })

    } catch (error) {
      console.error('Remove member API error:', error)
      return handleApiError(error)
    }
  })
}