// =============================================
// MULTI-TENANCY TYPES
// =============================================

export interface Organization {
  id: string
  name: string
  slug: string
  subscription_plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  stripe_customer_id?: string
  stripe_subscription_id?: string
  trial_ends_at?: string
  billing_email?: string
  settings: OrganizationSettings
  created_at: string
  updated_at: string
}

export type SubscriptionPlan = 'starter' | 'professional' | 'business' | 'enterprise'

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'

export interface OrganizationSettings {
  company_name?: string
  website?: string
  timezone?: string
  date_format?: string
  language?: string
  notifications?: {
    email_alerts?: boolean
    sms_alerts?: boolean
    webhook_alerts?: boolean
  }
  branding?: {
    logo_url?: string
    primary_color?: string
    secondary_color?: string
  }
}

export interface SubscriptionPlanDetails {
  id: SubscriptionPlan
  name: string
  description: string
  price_monthly: number
  price_yearly?: number
  features: string[]
  limits: PlanLimits
  stripe_price_id_monthly?: string
  stripe_price_id_yearly?: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface PlanLimits {
  whatsapp_accounts: number // -1 for unlimited
  monthly_messages: number // -1 for unlimited
  team_members: number // -1 for unlimited
  auto_replies: number // -1 for unlimited
  campaigns: number // -1 for unlimited
  api_calls?: number // -1 for unlimited
  file_storage_gb?: number // -1 for unlimited
  webhook_endpoints?: number // -1 for unlimited
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  permissions: MemberPermissions
  invited_by?: string
  invited_at: string
  joined_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  user?: {
    id: string
    email: string
    user_metadata?: {
      full_name?: string
      avatar_url?: string
    }
  }
}

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface MemberPermissions {
  // WhatsApp Management
  manage_whatsapp_sessions?: boolean
  send_messages?: boolean
  view_messages?: boolean
  export_messages?: boolean
  
  // Contact Management
  manage_contacts?: boolean
  import_contacts?: boolean
  export_contacts?: boolean
  
  // Campaigns & Automation
  create_campaigns?: boolean
  manage_auto_replies?: boolean
  view_analytics?: boolean
  export_analytics?: boolean
  
  // Team Management
  invite_members?: boolean
  manage_members?: boolean
  
  // Organization Settings
  manage_billing?: boolean
  manage_settings?: boolean
  manage_integrations?: boolean
  
  // API Access
  use_api?: boolean
  manage_api_keys?: boolean
}

export interface OrganizationUsage {
  id: string
  organization_id: string
  metric_name: UsageMetric
  metric_value: number
  period_start: string
  period_end: string
  created_at: string
}

export type UsageMetric = 
  | 'messages_sent'
  | 'messages_received'
  | 'whatsapp_accounts'
  | 'team_members'
  | 'api_calls'
  | 'campaigns_created'
  | 'auto_replies_triggered'
  | 'file_uploads'
  | 'webhook_calls'

export interface UsageSummary {
  organization_id: string
  period_start: string
  period_end: string
  metrics: {
    [key in UsageMetric]?: number
  }
  limits: PlanLimits
  usage_percentage: {
    [key in UsageMetric]?: number
  }
}

// =============================================
// BILLING TYPES
// =============================================

export interface BillingInfo {
  customer_id?: string
  subscription_id?: string
  current_plan: SubscriptionPlan
  plan_details: SubscriptionPlanDetails
  billing_cycle: 'monthly' | 'yearly'
  next_billing_date?: string
  trial_ends_at?: string
  usage_summary: UsageSummary
  invoices: Invoice[]
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed'
  created_at: string
  invoice_url?: string
  description: string
}

// =============================================
// CONTEXT TYPES
// =============================================

export interface TenantContext {
  organization: Organization | null
  member: OrganizationMember | null
  usage: UsageSummary | null
  isLoading: boolean
  canPerform: (action: keyof MemberPermissions) => boolean
  hasReachedLimit: (metric: UsageMetric, requestedAmount?: number) => boolean
  switchOrganization: (orgId: string) => Promise<void>
  refreshUsage: () => Promise<void>
}

// =============================================
// API TYPES
// =============================================

export interface CreateOrganizationRequest {
  name: string
  slug?: string
  plan?: SubscriptionPlan
}

export interface UpdateOrganizationRequest {
  name?: string
  settings?: Partial<OrganizationSettings>
  billing_email?: string
}

export interface InviteMemberRequest {
  email: string
  role: MemberRole
  permissions?: Partial<MemberPermissions>
  send_email?: boolean
}

export interface UpdateMemberRequest {
  role?: MemberRole
  permissions?: Partial<MemberPermissions>
  is_active?: boolean
}

export interface UpgradeSubscriptionRequest {
  plan: SubscriptionPlan
  billing_cycle: 'monthly' | 'yearly'
  success_url: string
  cancel_url: string
}

// =============================================
// UTILITY TYPES
// =============================================

export interface PlanComparison {
  features: {
    name: string
    starter: boolean | string
    professional: boolean | string
    business: boolean | string
    enterprise: boolean | string
  }[]
  limits: {
    name: string
    starter: string
    professional: string
    business: string
    enterprise: string
  }[]
}

// Default permissions per role
export const DEFAULT_PERMISSIONS: Record<MemberRole, MemberPermissions> = {
  owner: {
    manage_whatsapp_sessions: true,
    send_messages: true,
    view_messages: true,
    export_messages: true,
    manage_contacts: true,
    import_contacts: true,
    export_contacts: true,
    create_campaigns: true,
    manage_auto_replies: true,
    view_analytics: true,
    export_analytics: true,
    invite_members: true,
    manage_members: true,
    manage_billing: true,
    manage_settings: true,
    manage_integrations: true,
    use_api: true,
    manage_api_keys: true,
  },
  admin: {
    manage_whatsapp_sessions: true,
    send_messages: true,
    view_messages: true,
    export_messages: true,
    manage_contacts: true,
    import_contacts: true,
    export_contacts: true,
    create_campaigns: true,
    manage_auto_replies: true,
    view_analytics: true,
    export_analytics: true,
    invite_members: true,
    manage_members: true,
    manage_billing: false,
    manage_settings: true,
    manage_integrations: true,
    use_api: true,
    manage_api_keys: false,
  },
  member: {
    manage_whatsapp_sessions: false,
    send_messages: true,
    view_messages: true,
    export_messages: false,
    manage_contacts: true,
    import_contacts: true,
    export_contacts: false,
    create_campaigns: true,
    manage_auto_replies: true,
    view_analytics: true,
    export_analytics: false,
    invite_members: false,
    manage_members: false,
    manage_billing: false,
    manage_settings: false,
    manage_integrations: false,
    use_api: false,
    manage_api_keys: false,
  },
  viewer: {
    manage_whatsapp_sessions: false,
    send_messages: false,
    view_messages: true,
    export_messages: false,
    manage_contacts: false,
    import_contacts: false,
    export_contacts: false,
    create_campaigns: false,
    manage_auto_replies: false,
    view_analytics: true,
    export_analytics: false,
    invite_members: false,
    manage_members: false,
    manage_billing: false,
    manage_settings: false,
    manage_integrations: false,
    use_api: false,
    manage_api_keys: false,
  },
}