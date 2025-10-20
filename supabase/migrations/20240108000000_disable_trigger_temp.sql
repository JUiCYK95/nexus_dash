-- =============================================
-- TEMPORARILY DISABLE TRIGGER TO ALLOW REGISTRATION
-- =============================================

-- Disable the problematic trigger completely
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;

-- Keep the function but don't auto-trigger it
-- We'll handle organization creation manually in the app

SELECT 'Trigger disabled - registration should work now' as status;