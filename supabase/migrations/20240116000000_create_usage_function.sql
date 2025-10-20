-- =============================================
-- CREATE USAGE SUMMARY FUNCTION
-- =============================================

-- Create the missing usage summary function
CREATE OR REPLACE FUNCTION get_organization_usage_summary(org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  plan_limits JSON;
  current_usage JSON;
  usage_percentages JSON;
BEGIN
  -- Get the organization's subscription plan
  SELECT 
    CASE subscription_plan
      WHEN 'starter' THEN '{"messages_sent": 1000, "contacts_imported": 500, "campaigns_created": 10, "api_calls": 10000}'::JSON
      WHEN 'pro' THEN '{"messages_sent": 10000, "contacts_imported": 5000, "campaigns_created": 100, "api_calls": 100000}'::JSON
      WHEN 'enterprise' THEN '{"messages_sent": -1, "contacts_imported": -1, "campaigns_created": -1, "api_calls": -1}'::JSON
      ELSE '{"messages_sent": 1000, "contacts_imported": 500, "campaigns_created": 10, "api_calls": 10000}'::JSON
    END INTO plan_limits
  FROM organizations 
  WHERE id = org_id;
  
  -- Get current usage from organization_usage table
  SELECT COALESCE(
    JSON_BUILD_OBJECT(
      'messages_sent', COALESCE(SUM(CASE WHEN metric_name = 'messages_sent' THEN metric_value ELSE 0 END), 0),
      'contacts_imported', COALESCE(SUM(CASE WHEN metric_name = 'contacts_imported' THEN metric_value ELSE 0 END), 0),
      'campaigns_created', COALESCE(SUM(CASE WHEN metric_name = 'campaigns_created' THEN metric_value ELSE 0 END), 0),
      'api_calls', COALESCE(SUM(CASE WHEN metric_name = 'api_calls' THEN metric_value ELSE 0 END), 0)
    ),
    '{"messages_sent": 0, "contacts_imported": 0, "campaigns_created": 0, "api_calls": 0}'::JSON
  ) INTO current_usage
  FROM organization_usage
  WHERE organization_id = org_id
    AND period_start >= DATE_TRUNC('month', CURRENT_DATE);
  
  -- Calculate usage percentages
  SELECT JSON_BUILD_OBJECT(
    'messages_sent', 
    CASE 
      WHEN (plan_limits->>'messages_sent')::INT = -1 THEN 0
      ELSE LEAST(100, ROUND((current_usage->>'messages_sent')::NUMERIC / (plan_limits->>'messages_sent')::NUMERIC * 100, 2))
    END,
    'contacts_imported',
    CASE 
      WHEN (plan_limits->>'contacts_imported')::INT = -1 THEN 0
      ELSE LEAST(100, ROUND((current_usage->>'contacts_imported')::NUMERIC / (plan_limits->>'contacts_imported')::NUMERIC * 100, 2))
    END,
    'campaigns_created',
    CASE 
      WHEN (plan_limits->>'campaigns_created')::INT = -1 THEN 0
      ELSE LEAST(100, ROUND((current_usage->>'campaigns_created')::NUMERIC / (plan_limits->>'campaigns_created')::NUMERIC * 100, 2))
    END,
    'api_calls',
    CASE 
      WHEN (plan_limits->>'api_calls')::INT = -1 THEN 0
      ELSE LEAST(100, ROUND((current_usage->>'api_calls')::NUMERIC / (plan_limits->>'api_calls')::NUMERIC * 100, 2))
    END
  ) INTO usage_percentages;
  
  -- Build final result
  SELECT JSON_BUILD_OBJECT(
    'metrics', current_usage,
    'limits', plan_limits,
    'usage_percentage', usage_percentages
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_organization_usage_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_usage_summary(UUID) TO anon;

SELECT 'Usage summary function created successfully' as status;