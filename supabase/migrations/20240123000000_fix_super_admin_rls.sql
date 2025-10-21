-- =============================================
-- FIX SUPER ADMIN RLS INFINITE RECURSION
-- =============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Super admins can view super admins" ON super_admins;

-- Create new policy using the is_super_admin() function which bypasses RLS
CREATE POLICY "Super admins can view super admins" ON super_admins
  FOR SELECT USING (is_super_admin());

-- Also allow users to see their own super admin status
CREATE POLICY "Users can view their own super admin status" ON super_admins
  FOR SELECT USING (user_id = auth.uid());

-- Super admins can insert new super admins
DROP POLICY IF EXISTS "Super admins can insert super admins" ON super_admins;
CREATE POLICY "Super admins can insert super admins" ON super_admins
  FOR INSERT WITH CHECK (is_super_admin());

-- Super admins can update super admin records
DROP POLICY IF EXISTS "Super admins can update super admins" ON super_admins;
CREATE POLICY "Super admins can update super admins" ON super_admins
  FOR UPDATE USING (is_super_admin());

-- Super admins can delete super admin records
DROP POLICY IF EXISTS "Super admins can delete super admins" ON super_admins;
CREATE POLICY "Super admins can delete super admins" ON super_admins
  FOR DELETE USING (is_super_admin());

COMMENT ON POLICY "Super admins can view super admins" ON super_admins IS
  'Allow super admins to view all super admin records using SECURITY DEFINER function to avoid recursion';
COMMENT ON POLICY "Users can view their own super admin status" ON super_admins IS
  'Allow users to check their own super admin status';
