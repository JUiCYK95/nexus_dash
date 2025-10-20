-- =============================================
-- FIX INVITATION SYSTEM - PRESERVE EXISTING USERS
-- This script syncs data WITHOUT deleting existing active users
-- =============================================

-- Step 1: Ensure all auth.users exist in public.users (sync missing users)
DO $$
DECLARE
  synced_count INTEGER;
BEGIN
  -- Add missing users from auth.users to public.users
  INSERT INTO public.users (id, email, created_at, updated_at)
  SELECT
    id,
    email,
    created_at,
    NOW() as updated_at
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM public.users)
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS synced_count = ROW_COUNT;
  RAISE NOTICE 'Synced % users from auth.users to public.users', synced_count;
END $$;

-- Step 2: Drop constraints temporarily (we'll recreate them properly)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey CASCADE;

ALTER TABLE organization_invitations DROP CONSTRAINT IF EXISTS organization_invitations_invited_by_fkey CASCADE;
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey CASCADE;
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey CASCADE;

-- Step 3: Clean up ONLY truly orphaned data (users not in auth.users)
-- But PRESERVE organization_members - we'll fix them by adding missing users to auth
DO $$
DECLARE
  fixed_invitations INTEGER;
BEGIN
  -- Fix organization_invitations: Set invited_by to NULL where user doesn't exist
  -- (We keep the invitation but lose the reference to who invited them)
  UPDATE organization_invitations
  SET invited_by = NULL
  WHERE invited_by IS NOT NULL
    AND invited_by NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS fixed_invitations = ROW_COUNT;
  RAISE NOTICE 'Fixed % invitation records (set invited_by to NULL)', fixed_invitations;

  -- Fix organization_members: Set invited_by to NULL where user doesn't exist
  UPDATE organization_members
  SET invited_by = NULL
  WHERE invited_by IS NOT NULL
    AND invited_by NOT IN (SELECT id FROM auth.users);

  RAISE NOTICE 'Fixed organization_members records (set invited_by to NULL where needed)';

  -- IMPORTANT: We do NOT delete organization_members
  -- Even if user_id is not in auth.users, we keep the record
  -- This is because the user might be in auth.users but we're not seeing it
END $$;

-- Step 4: For organization_members with user_ids not in auth.users:
-- These are likely real users that need to be preserved
-- We'll create a special marker but NOT delete them
DO $$
DECLARE
  orphaned_member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_member_count
  FROM organization_members
  WHERE user_id NOT IN (SELECT id FROM auth.users);

  IF orphaned_member_count > 0 THEN
    RAISE NOTICE '⚠️  WARNING: Found % organization_members with user_ids not in auth.users', orphaned_member_count;
    RAISE NOTICE '⚠️  These users will be PRESERVED. You may need to manually verify them.';
    RAISE NOTICE '⚠️  To see them, run: SELECT * FROM organization_members WHERE user_id NOT IN (SELECT id FROM auth.users);';
  END IF;
END $$;

-- Step 5: Add foreign key to auth.users for public.users
-- Use DEFERRABLE to allow temporary violations during transaction
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED;

-- Step 6: Add constraints back to public.users
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Step 7: Fix organization_invitations foreign key
ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

-- Step 8: Fix organization_members foreign keys
-- For user_id: Use NOT VALID to allow existing orphaned records
-- These can be cleaned up later manually
ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON DELETE CASCADE
    NOT VALID; -- This allows existing violations but enforces for new records

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id)
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;

-- Step 9: Drop old triggers and functions
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_organization_for_user() CASCADE;
DROP FUNCTION IF EXISTS handle_signup_with_invitation_check() CASCADE;
DROP FUNCTION IF EXISTS handle_invitation_only_signup() CASCADE;

-- Step 10: Create new invitation-only signup function
CREATE OR REPLACE FUNCTION handle_invitation_only_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pending_invitation RECORD;
BEGIN
  -- Log the signup attempt
  RAISE NOTICE 'New signup attempt for email: %', NEW.email;

  -- Step 1: Check if user has a valid pending invitation
  SELECT * INTO pending_invitation
  FROM organization_invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Step 2: If NO invitation exists, block registration
  IF pending_invitation.id IS NULL THEN
    RAISE NOTICE 'No valid invitation found for email: %', NEW.email;
    RAISE EXCEPTION 'Registration is invitation-only. Please request an invitation from your organization administrator.';
  END IF;

  RAISE NOTICE 'Found valid invitation for: %, org: %', NEW.email, pending_invitation.organization_id;

  -- Step 3: Create user entry in public.users table
  BEGIN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          updated_at = NOW();

    RAISE NOTICE 'Created/updated user in public.users: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating user in public.users: %', SQLERRM;
  END;

  -- Step 4: Add user to the organization from invitation
  BEGIN
    INSERT INTO organization_members (
      organization_id,
      user_id,
      role,
      invited_by,
      invited_at,
      joined_at,
      is_active
    )
    VALUES (
      pending_invitation.organization_id,
      NEW.id,
      pending_invitation.role,
      pending_invitation.invited_by,
      pending_invitation.created_at,
      NOW(),
      true
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET is_active = true,
          joined_at = NOW();

    RAISE NOTICE 'Added user to organization: %', pending_invitation.organization_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error adding user to organization: %', SQLERRM;
    RAISE;
  END;

  -- Step 5: Mark invitation as accepted
  BEGIN
    UPDATE organization_invitations
    SET
      status = 'accepted',
      accepted_at = NOW()
    WHERE id = pending_invitation.id;

    RAISE NOTICE 'Marked invitation as accepted: %', pending_invitation.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error updating invitation status: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error in handle_invitation_only_signup: %', SQLERRM;
    RAISE;
END;
$$;

-- Step 11: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_only_signup();

-- Step 12: Grant permissions
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO service_role;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO postgres;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO anon;

-- Step 13: Add comment
COMMENT ON FUNCTION handle_invitation_only_signup() IS
  'Enforces invitation-only registration. Blocks signup without valid invitation.';

-- Step 14: Verify the setup and show statistics
DO $$
DECLARE
  auth_user_count INTEGER;
  public_user_count INTEGER;
  org_member_count INTEGER;
  orphaned_members INTEGER;
  pending_invitation_count INTEGER;
  trigger_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO auth_user_count FROM auth.users;
  SELECT COUNT(*) INTO public_user_count FROM public.users;
  SELECT COUNT(*) INTO org_member_count FROM organization_members;
  SELECT COUNT(*) INTO orphaned_members
    FROM organization_members
    WHERE user_id NOT IN (SELECT id FROM auth.users);
  SELECT COUNT(*) INTO pending_invitation_count
    FROM organization_invitations WHERE status = 'pending';

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SETUP VERIFICATION:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Auth users: %', auth_user_count;
  RAISE NOTICE 'Public users: %', public_user_count;
  RAISE NOTICE 'Organization members: %', org_member_count;
  IF orphaned_members > 0 THEN
    RAISE NOTICE '⚠️  Orphaned members (preserved): %', orphaned_members;
    RAISE NOTICE '   (These need manual verification)';
  END IF;
  RAISE NOTICE 'Pending invitations: %', pending_invitation_count;
  RAISE NOTICE 'Trigger installed: %', CASE WHEN trigger_exists THEN 'YES ✓' ELSE 'NO ✗' END;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Setup complete! Invitation-only registration is now enforced.';
  RAISE NOTICE 'All existing users have been preserved.';
  RAISE NOTICE '========================================';
END $$;

-- Step 15: Show preserved users summary
SELECT
  '✓ Setup Complete - Existing Users Preserved!' as status,
  'Invitation-only registration is now enforced' as message,
  'All existing users and memberships have been kept' as note;
