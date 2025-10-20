-- =============================================
-- ADD SUPER ADMIN FUNCTIONALITY
-- =============================================

-- Add is_super_admin to users table metadata
-- This will be stored in raw_user_meta_data JSONB field
-- Example: UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"is_super_admin": true}'::jsonb WHERE email = 'admin@example.com';

-- Create super_admins table for better management
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX idx_super_admins_active ON super_admins(is_active);

-- Enable RLS but allow super admins to bypass it
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can view all super admins
CREATE POLICY "Super admins can view super admins" ON super_admins
  FOR SELECT USING (
    user_id IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- If no user_id provided, use the authenticated user
  target_user_id := COALESCE(check_user_id, auth.uid());

  -- Check if user exists in super_admins table
  RETURN EXISTS (
    SELECT 1 FROM super_admins
    WHERE user_id = target_user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;

-- Create super admin activity log
CREATE TABLE IF NOT EXISTS super_admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT, -- 'organization', 'user', 'subscription', etc.
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_super_admin_logs_admin ON super_admin_logs(admin_user_id);
CREATE INDEX idx_super_admin_logs_action ON super_admin_logs(action);
CREATE INDEX idx_super_admin_logs_created ON super_admin_logs(created_at);

-- Enable RLS
ALTER TABLE super_admin_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view logs
CREATE POLICY "Super admins can view logs" ON super_admin_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins WHERE is_active = true)
  );

-- Function to log super admin actions
CREATE OR REPLACE FUNCTION log_super_admin_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO super_admin_logs (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_super_admin_action(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Add super admin policies to allow access to all data
-- Organizations - Super admins can view and update all
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
CREATE POLICY "Super admins can view all organizations" ON organizations
  FOR SELECT USING (
    is_super_admin() OR
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can update all organizations" ON organizations;
CREATE POLICY "Super admins can update all organizations" ON organizations
  FOR UPDATE USING (
    is_super_admin() OR
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can insert organizations" ON organizations;
CREATE POLICY "Super admins can insert organizations" ON organizations
  FOR INSERT WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;
CREATE POLICY "Super admins can delete organizations" ON organizations
  FOR DELETE USING (is_super_admin());

-- Organization members - Super admins can manage all
DROP POLICY IF EXISTS "Super admins can view all members" ON organization_members;
CREATE POLICY "Super admins can view all members" ON organization_members
  FOR SELECT USING (
    is_super_admin() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all members" ON organization_members;
CREATE POLICY "Super admins can manage all members" ON organization_members
  FOR ALL USING (is_super_admin());

-- Organization usage - Super admins can view all
DROP POLICY IF EXISTS "Super admins can view all usage" ON organization_usage;
CREATE POLICY "Super admins can view all usage" ON organization_usage
  FOR SELECT USING (
    is_super_admin() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Billing events - Super admins can view all
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all billing events" ON billing_events;
CREATE POLICY "Super admins can view all billing events" ON billing_events
  FOR SELECT USING (
    is_super_admin() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Audit logs - Super admins can view all
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all audit logs" ON audit_logs;
CREATE POLICY "Super admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    is_super_admin() OR
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create views for super admin dashboard
CREATE OR REPLACE VIEW super_admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM organizations) as total_organizations,
  (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'active') as active_organizations,
  (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'trialing') as trial_organizations,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(DISTINCT user_id) FROM organization_members WHERE is_active = true) as active_users,
  (SELECT COUNT(*) FROM organization_members) as total_memberships,
  (SELECT SUM(metric_value) FROM organization_usage WHERE metric_name = 'messages_sent' AND period_start = DATE_TRUNC('month', NOW())) as monthly_messages,
  (SELECT COUNT(*) FROM super_admins WHERE is_active = true) as super_admin_count;

-- Grant select on view
GRANT SELECT ON super_admin_dashboard_stats TO authenticated;

-- Create view for organization overview
CREATE OR REPLACE VIEW super_admin_organizations_overview AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.subscription_plan,
  o.subscription_status,
  o.stripe_customer_id,
  o.trial_ends_at,
  o.billing_email,
  o.created_at,
  o.updated_at,
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id AND is_active = true) as member_count,
  (SELECT role FROM organization_members WHERE organization_id = o.id AND role = 'owner' LIMIT 1) as owner_role,
  (SELECT u.email FROM organization_members om JOIN auth.users u ON om.user_id = u.id WHERE om.organization_id = o.id AND om.role = 'owner' LIMIT 1) as owner_email
FROM organizations o
ORDER BY o.created_at DESC;

GRANT SELECT ON super_admin_organizations_overview TO authenticated;

COMMENT ON TABLE super_admins IS 'Super administrators with full system access';
COMMENT ON TABLE super_admin_logs IS 'Activity logs for super admin actions';
COMMENT ON FUNCTION is_super_admin(UUID) IS 'Check if a user is an active super admin';
COMMENT ON VIEW super_admin_dashboard_stats IS 'Overview statistics for super admin dashboard';
COMMENT ON VIEW super_admin_organizations_overview IS 'Organization details for super admin management';
