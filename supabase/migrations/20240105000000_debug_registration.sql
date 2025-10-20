-- =============================================
-- DEBUG REGISTRATION ISSUES
-- =============================================

-- Check if the trigger function exists and is working
SELECT 
    p.proname as function_name,
    p.prosecdef as is_security_definer,
    p.proconfig as search_path_config
FROM pg_proc p
WHERE p.proname IN (
    'create_organization_for_user',
    'update_updated_at_column',
    'track_usage',
    'check_usage_limit'
);

-- Check if triggers exist
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname IN ('create_org_on_signup', 'update_organizations_updated_at', 'update_org_members_updated_at');

-- Check RLS status on critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE schemaname = t.schemaname AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE t.tablename IN (
    'organizations',
    'organization_members',
    'organization_usage',
    'subscription_plans',
    'messages',
    'contacts'
)
AND t.schemaname = 'public'
ORDER BY t.tablename;

-- Check if subscription_plans table has data
SELECT id, name, price_monthly FROM subscription_plans ORDER BY sort_order;

-- Improve the create_organization_for_user function with better error handling
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
  retry_count INTEGER := 0;
  max_retries INTEGER := 3;
BEGIN
  -- Add logging for debugging
  RAISE NOTICE 'Creating organization for user: %', NEW.id;
  
  -- Generate organization name from user metadata or email
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'My Organization'
  );
  
  RAISE NOTICE 'Organization name: %', org_name;
  
  -- Generate unique slug with retry logic
  WHILE retry_count < max_retries LOOP
    BEGIN
      org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
      
      RAISE NOTICE 'Attempting to create organization with slug: %', org_slug;
      
      -- Create organization
      INSERT INTO organizations (name, slug, subscription_plan, subscription_status)
      VALUES (org_name, org_slug, 'starter', 'trialing')
      RETURNING id INTO org_id;
      
      RAISE NOTICE 'Organization created with ID: %', org_id;
      
      -- Add user as owner
      INSERT INTO organization_members (organization_id, user_id, role, joined_at)
      VALUES (org_id, NEW.id, 'owner', NOW());
      
      RAISE NOTICE 'User added as owner to organization: %', org_id;
      
      -- Exit loop if successful
      EXIT;
      
    EXCEPTION
      WHEN unique_violation THEN
        retry_count := retry_count + 1;
        RAISE NOTICE 'Slug collision, retrying (attempt %/%)', retry_count, max_retries;
        
        IF retry_count >= max_retries THEN
          RAISE EXCEPTION 'Failed to create unique organization slug after % attempts', max_retries;
        END IF;
      
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating organization: % - %', SQLSTATE, SQLERRM;
    END;
  END LOOP;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Fatal error in create_organization_for_user: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- Recreate the trigger to ensure it's properly linked
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
CREATE TRIGGER create_org_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_organization_for_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT, INSERT ON organizations TO authenticated;
GRANT SELECT, INSERT ON organization_members TO authenticated;

COMMENT ON FUNCTION create_organization_for_user() IS 'Enhanced trigger function with error handling and logging for debugging registration issues';