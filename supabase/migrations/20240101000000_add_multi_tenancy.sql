-- =============================================
-- PHASE 1: MULTI-TENANCY FOUNDATION
-- =============================================

-- Create organizations table (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'professional', 'business', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_ends_at TIMESTAMPTZ,
  billing_email TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscription plans table
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL, -- in cents
  price_yearly INTEGER, -- in cents (optional)
  features JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
('starter', 'Starter', 'Perfect for small businesses getting started', 2900, 29000, 
 '["basic_analytics", "manual_messages", "contact_management"]',
 '{"whatsapp_accounts": 1, "monthly_messages": 1000, "team_members": 1, "auto_replies": 5}', 1),
('professional', 'Professional', 'Advanced features for growing businesses', 9900, 99000,
 '["auto_replies", "advanced_analytics", "campaigns", "file_uploads", "webhooks"]',
 '{"whatsapp_accounts": 3, "monthly_messages": 10000, "team_members": 5, "auto_replies": 50, "campaigns": 10}', 2),
('business', 'Business', 'Complete solution for established businesses', 29900, 299000,
 '["api_access", "white_label", "priority_support", "custom_integrations", "advanced_automation"]',
 '{"whatsapp_accounts": 10, "monthly_messages": 50000, "team_members": 20, "auto_replies": 200, "campaigns": 50}', 3),
('enterprise', 'Enterprise', 'Custom solution with dedicated support', 99900, 999000,
 '["unlimited_everything", "sso", "dedicated_support", "sla", "custom_features"]',
 '{"whatsapp_accounts": -1, "monthly_messages": -1, "team_members": -1, "auto_replies": -1, "campaigns": -1}', 4);

-- Create organization members table (team management)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Create usage tracking table
CREATE TABLE organization_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- 'messages_sent', 'whatsapp_accounts', 'api_calls', etc.
  metric_value INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, metric_name, period_start)
);

-- Add organization_id to existing tables
ALTER TABLE whatsapp_sessions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_contacts ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_messages ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE auto_reply_rules ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE message_analytics ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe ON organizations(stripe_customer_id);
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_usage_org_metric ON organization_usage(organization_id, metric_name);
CREATE INDEX idx_usage_period ON organization_usage(period_start, period_end);

-- Create indexes on foreign keys
CREATE INDEX idx_whatsapp_sessions_org ON whatsapp_sessions(organization_id);
CREATE INDEX idx_whatsapp_contacts_org ON whatsapp_contacts(organization_id);
CREATE INDEX idx_whatsapp_messages_org ON whatsapp_messages(organization_id);
CREATE INDEX idx_auto_reply_rules_org ON auto_reply_rules(organization_id);
CREATE INDEX idx_message_analytics_org ON message_analytics(organization_id);

-- Create RLS policies for multi-tenancy
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Organizations: Only owners can update organization settings
CREATE POLICY "Owners can update organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );

-- Organization members: Users can see members of their organizations
CREATE POLICY "Users can view organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Usage tracking: Users can see usage of their organizations
CREATE POLICY "Users can view organization usage" ON organization_usage
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Subscription plans: Everyone can read (for pricing page)
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Update existing table policies to include organization_id
DROP POLICY IF EXISTS "Users can view their own WhatsApp sessions" ON whatsapp_sessions;
CREATE POLICY "Users can view organization WhatsApp sessions" ON whatsapp_sessions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view their own contacts" ON whatsapp_contacts;
CREATE POLICY "Users can view organization contacts" ON whatsapp_contacts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view their own messages" ON whatsapp_messages;
CREATE POLICY "Users can view organization messages" ON whatsapp_messages
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create functions for automatic organization creation
CREATE OR REPLACE FUNCTION create_organization_for_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  org_slug TEXT;
BEGIN
  -- Generate a unique slug from email
  org_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));
  
  -- Ensure slug is unique
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
    org_slug := org_slug || '-' || FLOOR(RANDOM() * 1000)::TEXT;
  END LOOP;
  
  -- Create organization
  INSERT INTO organizations (name, slug, subscription_plan, trial_ends_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)) || '''s Organization',
    org_slug,
    'starter',
    NOW() + INTERVAL '14 days'
  )
  RETURNING id INTO org_id;
  
  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role, joined_at)
  VALUES (org_id, NEW.id, 'owner', NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic organization creation
CREATE TRIGGER create_org_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_organization_for_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create billing events table for audit purposes
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  stripe_event_id TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_events_org_id ON billing_events(organization_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_created ON billing_events(created_at);

-- Create organization invitations table
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'member', 'admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX idx_org_invitations_email ON organization_invitations(email);
CREATE INDEX idx_org_invitations_token ON organization_invitations(token);

-- Create audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Create function to track usage
CREATE OR REPLACE FUNCTION track_usage(
  org_id UUID,
  metric TEXT,
  increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  current_period_start TIMESTAMPTZ;
  current_period_end TIMESTAMPTZ;
BEGIN
  -- Calculate current billing period (monthly)
  current_period_start := DATE_TRUNC('month', NOW());
  current_period_end := current_period_start + INTERVAL '1 month';
  
  -- Insert or update usage
  INSERT INTO organization_usage (organization_id, metric_name, metric_value, period_start, period_end)
  VALUES (org_id, metric, increment_by, current_period_start, current_period_end)
  ON CONFLICT (organization_id, metric_name, period_start)
  DO UPDATE SET metric_value = organization_usage.metric_value + increment_by;
END;
$$ LANGUAGE plpgsql;

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  org_id UUID,
  metric TEXT,
  requested_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  org_plan TEXT;
  plan_limits JSONB;
  current_usage INTEGER;
  limit_value INTEGER;
  current_period_start TIMESTAMPTZ;
BEGIN
  -- Get organization plan
  SELECT subscription_plan INTO org_plan FROM organizations WHERE id = org_id;
  
  -- Get plan limits
  SELECT limits INTO plan_limits FROM subscription_plans WHERE id = org_plan;
  
  -- Get limit for this metric (-1 means unlimited)
  limit_value := (plan_limits->metric)::INTEGER;
  
  -- If unlimited, return true
  IF limit_value = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Calculate current period
  current_period_start := DATE_TRUNC('month', NOW());
  
  -- Get current usage
  SELECT COALESCE(metric_value, 0) INTO current_usage
  FROM organization_usage
  WHERE organization_id = org_id 
    AND metric_name = metric 
    AND period_start = current_period_start;
  
  -- Check if request would exceed limit
  RETURN (current_usage + requested_amount) <= limit_value;
END;
$$ LANGUAGE plpgsql;

-- Note: organization_id columns for messages and contacts tables 
-- are created in the next migration (20240102000000_create_base_tables.sql)

-- Auto replies table (if exists)
CREATE TABLE IF NOT EXISTS auto_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_keywords TEXT[] DEFAULT '{}',
  response_message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auto_replies_organization_id ON auto_replies(organization_id);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  message_template TEXT NOT NULL,
  target_contacts UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'paused')),
  scheduled_at TIMESTAMPTZ,
  sent_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_organization_id ON campaigns(organization_id);

-- Grant necessary permissions
GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT ON organizations TO authenticated;
GRANT SELECT ON organization_members TO authenticated;
GRANT SELECT ON organization_usage TO authenticated;
GRANT SELECT ON billing_events TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;

-- Grant usage tracking function to authenticated users
GRANT EXECUTE ON FUNCTION track_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT, INTEGER) TO authenticated;

COMMENT ON TABLE organizations IS 'Multi-tenant organizations (SaaS tenants)';
COMMENT ON TABLE subscription_plans IS 'Available subscription plans with features and limits';
COMMENT ON TABLE organization_members IS 'Team members within organizations with roles';
COMMENT ON TABLE organization_usage IS 'Usage tracking for billing and limits enforcement';
COMMENT ON TABLE billing_events IS 'Stripe billing events for audit purposes';
COMMENT ON TABLE audit_logs IS 'Security and activity audit logs';
COMMENT ON TABLE organization_invitations IS 'Pending team member invitations';