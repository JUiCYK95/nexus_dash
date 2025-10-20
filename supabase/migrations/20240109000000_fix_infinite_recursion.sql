-- =============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- =============================================

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Allow all organization operations" ON organizations;
DROP POLICY IF EXISTS "Allow all membership operations" ON organization_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can access organizations" ON organizations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can access memberships" ON organization_members
  FOR ALL USING (true) WITH CHECK (true);

SELECT 'RLS policies fixed - no more infinite recursion' as status;