-- =============================================
-- COMPLETELY DISABLE RLS TO RESOLVE RECURSION
-- =============================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow all org operations for auth users" ON organizations;
DROP POLICY IF EXISTS "Allow all membership operations for auth users" ON organization_members;
DROP POLICY IF EXISTS "Users can read their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
DROP POLICY IF EXISTS "Users can read their memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can create their own membership" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can manage memberships" ON organization_members;

-- Disable RLS completely for now
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

SELECT 'RLS completely disabled to resolve recursion' as status;