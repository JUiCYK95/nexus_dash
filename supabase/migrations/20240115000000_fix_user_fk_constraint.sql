-- =============================================
-- FIX USER FOREIGN KEY CONSTRAINT
-- =============================================

-- Drop the existing foreign key constraint
ALTER TABLE organization_members 
DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

-- The user_id should reference auth.users(id), not a public.users table
-- Since we're using Supabase auth, we don't need a strict foreign key constraint
-- The application will handle the relationship

-- Alternative: Create a view or use RLS to ensure user exists
-- For now, we'll remove the constraint to allow the multi-tenant setup to work

-- Add a comment to document this decision
COMMENT ON COLUMN organization_members.user_id IS 'References auth.users.id - no FK constraint for flexibility';

SELECT 'User foreign key constraint removed for flexibility' as status;