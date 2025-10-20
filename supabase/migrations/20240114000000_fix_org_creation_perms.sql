-- =============================================
-- FIX ORGANIZATION CREATION PERMISSIONS
-- =============================================

-- Ensure anon users can create organizations (for registration flow)
DROP POLICY IF EXISTS "Allow all org operations for auth users" ON organizations;
DROP POLICY IF EXISTS "Allow all membership operations for auth users" ON organization_members;

-- Create permissive policies for authenticated and anon users
CREATE POLICY "Allow org creation for all users" ON organizations
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow org read for auth users" ON organizations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow org update for auth users" ON organizations
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow membership creation for all users" ON organization_members
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow membership read for auth users" ON organization_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow membership update for auth users" ON organization_members
  FOR UPDATE TO authenticated USING (true);

SELECT 'Organization creation permissions fixed' as status;