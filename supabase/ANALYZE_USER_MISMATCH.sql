-- =============================================
-- ANALYZE USER DATA MISMATCH
-- This helps us understand what's happening
-- =============================================

-- Check 1: Users in public.users but NOT in auth.users (PROBLEM!)
SELECT
  'Users in public.users but NOT in auth.users' as issue,
  COUNT(*) as count,
  ARRAY_AGG(email ORDER BY email) as emails
FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);

-- Check 2: Users in auth.users but NOT in public.users (Need to sync)
SELECT
  'Users in auth.users but NOT in public.users' as issue,
  COUNT(*) as count,
  ARRAY_AGG(email ORDER BY email) as emails
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);

-- Check 3: Show the problematic user
SELECT
  'Details of problematic user' as info,
  u.*
FROM public.users u
WHERE u.id = '40f57b74-ad65-4ddd-b8ad-561768c3e083';

-- Check 4: Does this user exist in auth.users?
SELECT
  'Check if user exists in auth.users' as info,
  CASE
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = '40f57b74-ad65-4ddd-b8ad-561768c3e083')
    THEN 'YES - User exists in auth.users'
    ELSE 'NO - User does NOT exist in auth.users'
  END as result;

-- Check 5: Show organization memberships for this user
SELECT
  'Organization memberships for problematic user' as info,
  om.*
FROM organization_members om
WHERE om.user_id = '40f57b74-ad65-4ddd-b8ad-561768c3e083';

-- Check 6: Total counts
SELECT
  'auth.users count' as table_name,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT
  'public.users count' as table_name,
  COUNT(*) as total
FROM public.users
UNION ALL
SELECT
  'organization_members count' as table_name,
  COUNT(*) as total
FROM organization_members;
