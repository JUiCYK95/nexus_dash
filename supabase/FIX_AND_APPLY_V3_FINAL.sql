-- =============================================
-- FIX INVITATION SYSTEM - VERSION 3 (COMPLETE DATA CLEANUP)
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Drop all foreign key constraints first (to allow cleanup)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey CASCADE;

ALTER TABLE organization_invitations DROP CONSTRAINT IF EXISTS organization_invitations_invited_by_fkey CASCADE;
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey CASCADE;
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey CASCADE;

-- Step 2: Clean up orphaned data in the correct order
DO $$
DECLARE
  deleted_members INTEGER;
  deleted_invitations INTEGER;
  deleted_users INTEGER;
BEGIN
  -- 2.1: Clean up organization_members with user_ids not in auth.users
  DELETE FROM organization_members
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS deleted_members = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphaned organization_members records', deleted_members;

  -- 2.2: Clean up organization_members with invited_by not in auth.users (set to NULL instead)
  UPDATE organization_members
  SET invited_by = NULL
  WHERE invited_by IS NOT NULL
    AND invited_by NOT IN (SELECT id FROM auth.users);

  -- 2.3: Clean up organization_invitations with invited_by not in auth.users (set to NULL)
  UPDATE organization_invitations
  SET invited_by = NULL
  WHERE invited_by IS NOT NULL
    AND invited_by NOT IN (SELECT id FROM auth.users);

  -- 2.4: Clean up public.users that don't exist in auth.users
  DELETE FROM public.users
  WHERE id NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS deleted_users = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphaned public.users records', deleted_users;

  RAISE NOTICE 'Data cleanup complete!';
END $$;

-- Step 3: Add foreign key to auth.users for public.users
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 4: Add constraints back to public.users
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Step 5: Fix organization_invitations foreign key
ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 6: Fix organization_members foreign keys
ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 7: Drop old triggers and functions
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_organization_for_user() CASCADE;
DROP FUNCTION IF EXISTS handle_signup_with_invitation_check() CASCADE;
DROP FUNCTION IF EXISTS handle_invitation_only_signup() CASCADE;

-- Step 8: Create new invitation-only signup function
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

-- Step 9: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_only_signup();

-- Step 10: Grant permissions
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO service_role;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO postgres;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO anon;

-- Step 11: Add comment
COMMENT ON FUNCTION handle_invitation_only_signup() IS
  'Enforces invitation-only registration. Blocks signup without valid invitation.';

-- Step 12: Verify the setup
DO $$
DECLARE
  auth_user_count INTEGER;
  public_user_count INTEGER;
  org_member_count INTEGER;
  pending_invitation_count INTEGER;
  trigger_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO auth_user_count FROM auth.users;
  SELECT COUNT(*) INTO public_user_count FROM public.users;
  SELECT COUNT(*) INTO org_member_count FROM organization_members;
  SELECT COUNT(*) INTO pending_invitation_count FROM organization_invitations WHERE status = 'pending';

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
  RAISE NOTICE 'Pending invitations: %', pending_invitation_count;
  RAISE NOTICE 'Trigger installed: %', CASE WHEN trigger_exists THEN 'YES ✓' ELSE 'NO ✗' END;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Setup complete! Invitation-only registration is now enforced.';
  RAISE NOTICE '========================================';
END $$;

-- Step 13: Show a helpful message
SELECT
  '🎉 Setup Complete!' as status,
  'Invitation-only registration is now enforced' as message,
  'Users can only register with a valid invitation token' as note;
