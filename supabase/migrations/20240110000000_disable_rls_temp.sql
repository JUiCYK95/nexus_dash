-- =============================================
-- TEMPORARILY DISABLE RLS FOR TESTING
-- =============================================

-- Disable RLS temporarily on these tables to allow registration to work
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled temporarily for testing' as status;