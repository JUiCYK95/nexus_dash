-- =============================================
-- FIX FUNCTION SECURITY WARNINGS
-- =============================================

-- Fix search_path security for all functions by recreating them with SECURITY DEFINER and fixed search_path

-- 1. Fix update_updated_at_column function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Fix create_organization_for_user function
DROP FUNCTION IF EXISTS create_organization_for_user() CASCADE;
CREATE OR REPLACE FUNCTION create_organization_for_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Generate organization name from user metadata or email
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'My Organization'
  );
  
  -- Generate unique slug
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
  
  -- Create organization
  INSERT INTO organizations (name, slug, subscription_plan, subscription_status)
  VALUES (org_name, org_slug, 'starter', 'trialing')
  RETURNING id INTO org_id;
  
  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role, joined_at)
  VALUES (org_id, NEW.id, 'owner', NOW());
  
  RETURN NEW;
END;
$$;

-- 3. Fix track_usage function
DROP FUNCTION IF EXISTS track_usage(UUID, TEXT, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION track_usage(
  org_id UUID,
  metric TEXT,
  increment_by INTEGER DEFAULT 1
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

-- 4. Fix check_usage_limit function
DROP FUNCTION IF EXISTS check_usage_limit(UUID, TEXT, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION check_usage_limit(
  org_id UUID,
  metric TEXT,
  requested_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

-- Recreate triggers that were dropped
CREATE TRIGGER create_org_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_organization_for_user();

CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_members_updated_at 
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant execute permissions to authenticated users for usage functions
GRANT EXECUTE ON FUNCTION track_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT, INTEGER) TO authenticated;

-- Add function comments
COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function to update updated_at timestamp - SECURITY DEFINER with fixed search_path';
COMMENT ON FUNCTION create_organization_for_user() IS 'Auto-create organization for new users - SECURITY DEFINER with fixed search_path';
COMMENT ON FUNCTION track_usage(UUID, TEXT, INTEGER) IS 'Track usage metrics for organizations - SECURITY DEFINER with fixed search_path';
COMMENT ON FUNCTION check_usage_limit(UUID, TEXT, INTEGER) IS 'Check if usage would exceed limits - SECURITY DEFINER with fixed search_path';