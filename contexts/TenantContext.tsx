'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  Organization,
  OrganizationMember,
  TenantContext as TenantContextType,
  UsageSummary,
  MemberPermissions,
  UsageMetric,
  DEFAULT_PERMISSIONS
} from '@/types/tenant'

const TenantContext = createContext<TenantContextType | null>(null)

interface TenantProviderProps {
  children: React.ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [member, setMember] = useState<OrganizationMember | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Initialize tenant context
  useEffect(() => {
    initializeTenant()
  }, [])

  const initializeTenant = async () => {
    try {
      setIsLoading(true)
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.log('No authenticated user found, creating demo organization...')
        // Create demo organization for development/demo purposes
        const demoUser = {
          id: 'demo-user-' + Date.now(),
          email: 'demo@example.com',
          user_metadata: { full_name: 'Demo User' }
        }
        
        const demoOrg = {
          id: 'demo-org-' + demoUser.id,
          name: 'Demo Organisation',
          slug: 'demo-org',
          subscription_plan: 'starter',
          subscription_status: 'trialing',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          trial_ends_at: null,
          created_at: new Date().toISOString()
        }
        
        const demoMember = {
          id: 'demo-member-' + demoUser.id,
          organization_id: demoOrg.id,
          user_id: demoUser.id,
          role: 'owner',
          is_active: true,
          joined_at: new Date().toISOString(),
          organization: demoOrg
        }
        
        setOrganization(demoOrg as any)
        setMember(demoMember as any)
        localStorage.setItem('current_organization_id', demoOrg.id)
        
        console.log('Demo organization created for unauthenticated access')
        toast.success('Demo-Organisation geladen')
        setIsLoading(false)
        return
      }

      // Check for organization in localStorage (for switching)
      const savedOrgId = localStorage.getItem('current_organization_id')
      
      // Get user's organizations
      let { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select(`
          id,
          role,
          is_active,
          joined_at,
          organization:organizations(
            id,
            name,
            slug,
            subscription_plan,
            subscription_status,
            stripe_customer_id,
            stripe_subscription_id,
            trial_ends_at,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

      // If no memberships found, create organization manually
      if (membershipsError || !memberships || memberships.length === 0) {
        console.log('No memberships found, creating organization manually...')
        console.log('MembershipsError:', membershipsError)
        console.log('Memberships data:', memberships)
        
        try {
          const orgName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Organization'
          const orgSlug = 'org-' + user.id.replace(/-/g, '')
          
          // First check if organization already exists
          const { data: existingOrg, error: checkError } = await supabase
            .from('organizations')
            .select('*')
            .eq('slug', orgSlug)
            .single()

          let newOrg = existingOrg

          if (checkError && checkError.code === 'PGRST116') {
            // Organization doesn't exist, create it
            const { data: createdOrg, error: createOrgError } = await supabase
              .from('organizations')
              .insert({
                name: orgName,
                slug: orgSlug,
                subscription_plan: 'starter',
                subscription_status: 'trialing'
              })
              .select()
              .single()

            if (createOrgError) {
              console.error('Error creating organization:', createOrgError)
              console.error('Full error details:', JSON.stringify(createOrgError, null, 2))
              toast.error(`Fehler beim Erstellen der Organisation: ${createOrgError.message || 'Unbekannter Fehler'}`)
              router.push('/login')
              return
            }
            
            newOrg = createdOrg
            console.log('Created new organization:', newOrg.name)
          } else if (checkError) {
            console.error('Error checking organization:', checkError)
            toast.error('Fehler beim Prüfen der Organisation')
            router.push('/login')
            return
          } else {
            console.log('Using existing organization:', newOrg.name)
          }

          // Check if user is already a member
          const { data: existingMember, error: memberCheckError } = await supabase
            .from('organization_members')
            .select('*')
            .eq('organization_id', newOrg.id)
            .eq('user_id', user.id)
            .single()

          let newMember = existingMember

          if (memberCheckError && memberCheckError.code === 'PGRST116') {
            // User is not a member, add them
            const { data: createdMember, error: memberError } = await supabase
              .from('organization_members')
              .insert({
                organization_id: newOrg.id,
                user_id: user.id,
                role: 'owner',
                is_active: true,
                joined_at: new Date().toISOString()
              })
              .select()
              .single()

            if (memberError) {
              console.error('Error adding member:', memberError)
              console.error('Full member error details:', JSON.stringify(memberError, null, 2))
              toast.error(`Fehler beim Hinzufügen als Mitglied: ${memberError.message || 'Unbekannter Fehler'}`)
              router.push('/login')
              return
            }
            
            newMember = createdMember
            console.log('Added user as organization member')
          } else if (memberCheckError) {
            console.error('Error checking membership:', memberCheckError)
            toast.error('Fehler beim Prüfen der Mitgliedschaft')
            router.push('/login')
            return
          } else {
            console.log('User is already a member of the organization')
          }

          // Create mock memberships array
          memberships = [{
            ...newMember,
            organization: newOrg
          }]
          
          console.log('Organization created successfully:', newOrg.name)
          toast.success(`Organisation "${newOrg.name}" erstellt`)
          
        } catch (error) {
          console.error('Failed to create organization:', error)
          toast.error('Fehler beim Erstellen der Organisation')
          router.push('/login')
          return
        }
      }

      if (!memberships || memberships.length === 0) {
        // User has no organizations - should not happen due to auto-creation
        console.error('Still no memberships after auto-creation attempt')
        toast.error('Keine Organisation gefunden')
        setIsLoading(false)
        return
      }

      console.log('Final memberships array:', memberships)

      // Find the organization to use
      let selectedMembership = memberships.find((m: any) => m.organization?.id === savedOrgId)
      if (!selectedMembership) {
        // Use the first organization (usually the user's own)
        selectedMembership = memberships[0]
      }

      console.log('Selected membership:', selectedMembership)
      console.log('Selected organization:', selectedMembership.organization)
      
      setOrganization(selectedMembership.organization as any)
      setMember(selectedMembership as any)
      
      // Store current organization
      localStorage.setItem('current_organization_id', (selectedMembership as any).organization.id)

      console.log('Organization set successfully:', selectedMembership.organization.name)
      toast.success(`Organisation geladen: ${selectedMembership.organization.name}`)
      
      // Load usage data
      await loadUsageData((selectedMembership as any).organization.id)

    } catch (error) {
      console.error('Error initializing tenant:', error)
      console.error('Creating fallback demo organization...')
      
      // Create a fallback demo organization
      const demoOrg = {
        id: 'demo-org-' + user.id,
        name: (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Demo') + 's Organisation',
        slug: 'demo-' + user.id.substring(0, 8),
        subscription_plan: 'starter',
        subscription_status: 'trialing',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        trial_ends_at: null,
        created_at: new Date().toISOString()
      }
      
      const demoMember = {
        id: 'demo-member-' + user.id,
        organization_id: demoOrg.id,
        user_id: user.id,
        role: 'owner',
        is_active: true,
        joined_at: new Date().toISOString(),
        organization: demoOrg
      }
      
      setOrganization(demoOrg as any)
      setMember(demoMember as any)
      localStorage.setItem('current_organization_id', demoOrg.id)
      
      console.log('Demo organization created:', demoOrg.name)
      toast.success(`Demo-Organisation "${demoOrg.name}" erstellt`)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsageData = async (organizationId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_organization_usage_summary', {
        org_id: organizationId
      })

      if (error) {
        console.error('Error loading usage data:', error)
        console.error('Full usage error details:', JSON.stringify(error, null, 2))
        // Set default usage data instead of failing
        setUsage({
          organization_id: 'default',
          period_start: new Date().toISOString(),
          period_end: new Date().toISOString(),
          metrics: {
            messages_sent: 0,
            campaigns_created: 0,
            api_calls: 0
          },
          limits: {
            whatsapp_accounts: 1,
            monthly_messages: 1000,
            team_members: 5,
            auto_replies: 10,
            campaigns: 10,
            api_calls: 10000
          },
          usage_percentage: {
            messages_sent: 0,
            campaigns_created: 0,
            api_calls: 0
          }
        } as any)
        return
      }

      setUsage(data)
    } catch (error) {
      console.error('Error loading usage:', error)
      // Set default usage data
      setUsage(null)
    }
  }

  const canPerform = useCallback((action: keyof MemberPermissions): boolean => {
    if (!member) return false
    
    // Get permissions from member or default permissions for role
    const permissions = member.permissions || DEFAULT_PERMISSIONS[member.role]
    
    return permissions[action] === true
  }, [member])

  const hasReachedLimit = useCallback((metric: UsageMetric, requestedAmount: number = 1): boolean => {
    if (!usage || !organization) return false
    
    const currentUsage = usage.metrics[metric] || 0
    const limit = usage.limits[metric as keyof typeof usage.limits]
    
    // -1 means unlimited
    if (limit === -1) return false
    
    return (currentUsage + requestedAmount) > (limit || 0)
  }, [usage, organization])

  const switchOrganization = useCallback(async (orgId: string) => {
    try {
      setIsLoading(true)
      
      // Get the membership for this organization
      const { data: membership, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('organization_id', orgId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true)
        .single()

      if (error || !membership) {
        toast.error('Organisation nicht gefunden oder kein Zugriff')
        return
      }

      setOrganization(membership.organization)
      setMember(membership)
      localStorage.setItem('current_organization_id', orgId)
      
      // Load new usage data
      await loadUsageData(orgId)
      
      toast.success(`Gewechselt zu ${membership.organization.name}`)
      
      // Redirect to dashboard to refresh everything
      router.push('/dashboard')
      
    } catch (error) {
      console.error('Error switching organization:', error)
      toast.error('Fehler beim Wechseln der Organisation')
    } finally {
      setIsLoading(false)
    }
  }, [router, supabase])

  const refreshUsage = useCallback(async () => {
    if (!organization) return
    await loadUsageData(organization.id)
  }, [organization])

  const contextValue: TenantContextType = {
    organization,
    member,
    usage,
    isLoading,
    canPerform,
    hasReachedLimit,
    switchOrganization,
    refreshUsage
  }

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

// Custom hooks for common checks
export function useCanPerform(action: keyof MemberPermissions) {
  const { canPerform } = useTenant()
  return canPerform(action)
}

export function useUsageLimit(metric: UsageMetric) {
  const { hasReachedLimit, usage } = useTenant()
  
  return {
    hasReached: (amount = 1) => hasReachedLimit(metric, amount),
    current: usage?.metrics[metric] || 0,
    limit: usage?.limits[metric as keyof typeof usage.limits] || 0,
    percentage: usage?.usage_percentage[metric] || 0,
    isUnlimited: (usage?.limits[metric as keyof typeof usage.limits] || 0) === -1
  }
}

export function useCurrentOrganization() {
  const { organization, member } = useTenant()
  return { organization, member }
}