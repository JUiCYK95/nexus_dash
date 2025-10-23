-- =============================================
-- FIX INVITED_BY CONSTRAINT
-- =============================================

-- Add foreign key constraint to invited_by column
-- This ensures invited_by references a valid user in auth.users
ALTER TABLE organization_invitations
  DROP CONSTRAINT IF EXISTS organization_invitations_invited_by_fkey;

-- Since invited_by should reference auth.users which is in a different schema,
-- we need to use the full path
ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_invited_by_fkey
  FOREIGN KEY (invited_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Since we're adding a foreign key that can be SET NULL on delete,
-- we should also allow NULL values for invited_by
-- (in case the inviter's account is deleted)
ALTER TABLE organization_invitations
  ALTER COLUMN invited_by DROP NOT NULL;

-- Add a comment to clarify the purpose
COMMENT ON COLUMN organization_invitations.invited_by IS
  'User ID of the person who created this invitation. Can be NULL if the inviter account is deleted.';

SELECT 'Invited_by constraint fixed successfully' as status;
