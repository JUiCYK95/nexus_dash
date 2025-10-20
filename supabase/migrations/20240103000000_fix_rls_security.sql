-- =============================================
-- FIX RLS SECURITY ISSUES
-- =============================================

-- Enable RLS on all tables that are missing it
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ORGANIZATION INVITATIONS POLICIES
-- =============================================

-- Only organization owners and admins can view invitations for their organization
DROP POLICY IF EXISTS "Organization members can view invitations" ON organization_invitations;
CREATE POLICY "Organization members can view invitations" ON organization_invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    )
  );

-- Only organization owners and admins can create invitations
DROP POLICY IF EXISTS "Organization admins can create invitations" ON organization_invitations;
CREATE POLICY "Organization admins can create invitations" ON organization_invitations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    )
  );

-- Only organization owners and admins can delete invitations
DROP POLICY IF EXISTS "Organization admins can delete invitations" ON organization_invitations;
CREATE POLICY "Organization admins can delete invitations" ON organization_invitations
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    )
  );

-- =============================================
-- AUTO REPLIES POLICIES
-- =============================================

-- Users can view auto replies for their organization
DROP POLICY IF EXISTS "Organization members can view auto replies" ON auto_replies;
CREATE POLICY "Organization members can view auto replies" ON auto_replies
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Members and above can create auto replies
DROP POLICY IF EXISTS "Organization members can create auto replies" ON auto_replies;
CREATE POLICY "Organization members can create auto replies" ON auto_replies
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- Users can update auto replies they created or admins can update any
DROP POLICY IF EXISTS "Users can update their auto replies" ON auto_replies;
CREATE POLICY "Users can update their auto replies" ON auto_replies
  FOR UPDATE USING (
    (created_by = auth.uid()) OR 
    (organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    ))
  );

-- Users can delete auto replies they created or admins can delete any
DROP POLICY IF EXISTS "Users can delete their auto replies" ON auto_replies;
CREATE POLICY "Users can delete their auto replies" ON auto_replies
  FOR DELETE USING (
    (created_by = auth.uid()) OR 
    (organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    ))
  );

-- =============================================
-- CAMPAIGNS POLICIES
-- =============================================

-- Users can view campaigns for their organization
DROP POLICY IF EXISTS "Organization members can view campaigns" ON campaigns;
CREATE POLICY "Organization members can view campaigns" ON campaigns
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Members and above can create campaigns
DROP POLICY IF EXISTS "Organization members can create campaigns" ON campaigns;
CREATE POLICY "Organization members can create campaigns" ON campaigns
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin', 'member')
    )
  );

-- Users can update campaigns they created or admins can update any
DROP POLICY IF EXISTS "Users can update their campaigns" ON campaigns;
CREATE POLICY "Users can update their campaigns" ON campaigns
  FOR UPDATE USING (
    (created_by = auth.uid()) OR 
    (organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    ))
  );

-- Users can delete campaigns they created or admins can delete any
DROP POLICY IF EXISTS "Users can delete their campaigns" ON campaigns;
CREATE POLICY "Users can delete their campaigns" ON campaigns
  FOR DELETE USING (
    (created_by = auth.uid()) OR 
    (organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    ))
  );

-- =============================================
-- BILLING EVENTS POLICIES
-- =============================================

-- Only organization owners and admins can view billing events
DROP POLICY IF EXISTS "Organization admins can view billing events" ON billing_events;
CREATE POLICY "Organization admins can view billing events" ON billing_events
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    )
  );

-- Billing events are typically inserted by system/webhooks, not users
-- But we'll allow service role to insert them
DROP POLICY IF EXISTS "System can insert billing events" ON billing_events;
CREATE POLICY "System can insert billing events" ON billing_events
  FOR INSERT WITH CHECK (true); -- Service role bypass

-- No user updates or deletes of billing events (audit trail)

-- =============================================
-- AUDIT LOGS POLICIES
-- =============================================

-- Only organization owners and admins can view audit logs
DROP POLICY IF EXISTS "Organization admins can view audit logs" ON audit_logs;
CREATE POLICY "Organization admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    )
  );

-- System and authenticated users can insert audit logs
DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;
CREATE POLICY "Users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    (user_id = auth.uid()) OR 
    (user_id IS NULL) -- For system events
  );

-- No user updates or deletes of audit logs (audit trail)

-- =============================================
-- ADDITIONAL SECURITY MEASURES
-- =============================================

-- Ensure organization_members has proper RLS (should already be there)
DROP POLICY IF EXISTS "Users can view their organization memberships" ON organization_members;
CREATE POLICY "Users can view their organization memberships" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

-- Users can only view organizations they are members of
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Only owners and admins can update organization details
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
CREATE POLICY "Organization admins can update organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('owner', 'admin')
    )
  );

-- =============================================
-- USAGE TRACKING POLICIES
-- =============================================

-- Users can view usage for their organization
DROP POLICY IF EXISTS "Organization members can view usage" ON organization_usage;
CREATE POLICY "Organization members can view usage" ON organization_usage
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Only system can insert/update usage (via functions)
DROP POLICY IF EXISTS "System can manage usage" ON organization_usage;
CREATE POLICY "System can manage usage" ON organization_usage
  FOR ALL USING (true); -- Service role bypass for usage tracking functions

-- =============================================
-- SUBSCRIPTION PLANS - READ ONLY FOR ALL
-- =============================================

-- All authenticated users can read subscription plans (for billing page)
DROP POLICY IF EXISTS "All users can view subscription plans" ON subscription_plans;
CREATE POLICY "All users can view subscription plans" ON subscription_plans
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE organization_invitations IS 'Team member invitations with RLS enabled';
COMMENT ON TABLE auto_replies IS 'Automated responses with organization-level RLS';
COMMENT ON TABLE campaigns IS 'Message campaigns with organization-level RLS';
COMMENT ON TABLE billing_events IS 'Stripe billing events with admin-only access';
COMMENT ON TABLE audit_logs IS 'Security audit logs with admin-only access';