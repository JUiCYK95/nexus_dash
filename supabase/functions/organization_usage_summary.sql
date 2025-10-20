-- =============================================
-- ORGANIZATION USAGE SUMMARY FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_organization_usage_summary(org_id UUID)
RETURNS JSON AS $$
DECLARE
  org_record organizations;
  plan_record subscription_plans;
  current_period_start TIMESTAMPTZ;
  current_period_end TIMESTAMPTZ;
  usage_data JSON;
  limits_data JSON;
  metrics_data JSON;
  usage_percentages JSON;
BEGIN
  -- Get organization
  SELECT * INTO org_record FROM organizations WHERE id = org_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;
  
  -- Get plan details
  SELECT * INTO plan_record FROM subscription_plans WHERE id = org_record.subscription_plan;
  
  -- Calculate current billing period
  current_period_start := DATE_TRUNC('month', NOW());
  current_period_end := current_period_start + INTERVAL '1 month';
  
  -- Get usage metrics for current period
  SELECT JSON_OBJECT_AGG(metric_name, metric_value) INTO metrics_data
  FROM organization_usage
  WHERE organization_id = org_id
    AND period_start = current_period_start;
  
  -- If no usage data, set defaults
  IF metrics_data IS NULL THEN
    metrics_data := '{}'::JSON;
  END IF;
  
  -- Get limits from plan
  limits_data := plan_record.limits;
  
  -- Calculate usage percentages
  SELECT JSON_OBJECT_AGG(
    key,
    CASE 
      WHEN (limits_data->key)::INTEGER = -1 THEN 0 -- Unlimited
      WHEN (limits_data->key)::INTEGER = 0 THEN 100 -- No allowance
      ELSE ROUND(
        (COALESCE((metrics_data->key)::INTEGER, 0)::DECIMAL / (limits_data->key)::INTEGER) * 100,
        2
      )
    END
  ) INTO usage_percentages
  FROM JSON_EACH_TEXT(limits_data);
  
  -- Build final result
  SELECT JSON_BUILD_OBJECT(
    'organization_id', org_id,
    'period_start', current_period_start,
    'period_end', current_period_end,
    'metrics', metrics_data,
    'limits', limits_data,
    'usage_percentage', usage_percentages
  ) INTO usage_data;
  
  RETURN usage_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_usage_summary(UUID) TO authenticated;

-- =============================================
-- TRACK USAGE HELPER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION track_organization_usage(
  org_id UUID,
  metric TEXT,
  increment_by INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_period_start TIMESTAMPTZ;
  current_period_end TIMESTAMPTZ;
  can_proceed BOOLEAN;
BEGIN
  -- Check if organization can perform this action
  SELECT check_usage_limit(org_id, metric, increment_by) INTO can_proceed;
  
  IF NOT can_proceed THEN
    RETURN FALSE;
  END IF;
  
  -- Track the usage
  PERFORM track_usage(org_id, metric, increment_by);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION track_organization_usage(UUID, TEXT, INTEGER) TO authenticated;

-- =============================================
-- GET USER ORGANIZATIONS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION get_user_organizations(user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  subscription_plan TEXT,
  subscription_status TEXT,
  trial_ends_at TIMESTAMPTZ,
  role TEXT,
  is_active BOOLEAN,
  member_since TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.subscription_plan,
    o.subscription_status,
    o.trial_ends_at,
    om.role,
    om.is_active,
    om.joined_at as member_since
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = get_user_organizations.user_id
    AND om.is_active = true
  ORDER BY om.role = 'owner' DESC, om.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_organizations(UUID) TO authenticated;

-- =============================================
-- CHECK ORGANIZATION ACCESS FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION check_organization_access(
  org_id UUID,
  required_permission TEXT DEFAULT NULL,
  user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  member_record organization_members;
  user_permissions JSON;
BEGIN
  -- Get member record
  SELECT * INTO member_record
  FROM organization_members
  WHERE organization_id = org_id
    AND user_id = check_organization_access.user_id
    AND is_active = true;
  
  -- If no membership, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If no specific permission required, just check membership
  IF required_permission IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific permission
  user_permissions := COALESCE(member_record.permissions, '{}'::JSON);
  
  -- If permission exists and is true, allow
  IF (user_permissions->required_permission)::BOOLEAN = true THEN
    RETURN TRUE;
  END IF;
  
  -- Check default permissions for role
  CASE member_record.role
    WHEN 'owner' THEN
      RETURN TRUE; -- Owners can do everything
    WHEN 'admin' THEN
      -- Admins can do most things except billing
      RETURN required_permission != 'manage_billing' AND required_permission != 'manage_api_keys';
    WHEN 'member' THEN
      -- Members have limited permissions
      RETURN required_permission IN ('send_messages', 'view_messages', 'manage_contacts', 'view_analytics');
    WHEN 'viewer' THEN
      -- Viewers can only view
      RETURN required_permission IN ('view_messages', 'view_analytics');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION check_organization_access(UUID, TEXT, UUID) TO authenticated;