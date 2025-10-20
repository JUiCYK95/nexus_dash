-- =============================================
-- FINAL FIX - SMART SYNC & CLEANUP
-- This intelligently handles all data inconsistencies
-- =============================================

-- Step 1: Show current state BEFORE changes
DO $$
DECLARE
  auth_count INTEGER;
  public_count INTEGER;
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO public_count FROM public.users;
  SELECT COUNT(*) INTO member_count FROM organization_members;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CURRENT STATE (BEFORE):';
  RAISE NOTICE 'auth.users: %', auth_count;
  RAISE NOTICE 'public.users: %', public_count;
  RAISE NOTICE 'organization_members: %', member_count;
  RAISE NOTICE '========================================';
END $$;

-- Step 2: Drop ALL constraints first to allow free manipulation
DO $$
BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key CASCADE;
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey CASCADE;
  ALTER TABLE organization_invitations DROP CONSTRAINT IF EXISTS organization_invitations_invited_by_fkey CASCADE;
  ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey CASCADE;
  ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey CASCADE;

  RAISE NOTICE 'Dropped all constraints';
END $$;

-- Step 3: SYNC - Add missing users from auth.users to public.users
DO $$
DECLARE
  synced_count INTEGER;
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  SELECT
    au.id,
    au.email,
    au.created_at,
    NOW() as updated_at
  FROM auth.users au
  WHERE au.id NOT IN (SELECT id FROM public.users);

  GET DIAGNOSTICS synced_count = ROW_COUNT;
  RAISE NOTICE 'Synced % users from auth.users to public.users', synced_count;
END $$;

-- Step 4: CLEANUP - Remove orphaned users from public.users (not in auth.users)
-- These are "zombie" records that should not exist
DO $$
DECLARE
  deleted_count INTEGER;
  deleted_emails TEXT[];
BEGIN
  -- First, get the emails for logging
  SELECT ARRAY_AGG(email) INTO deleted_emails
  FROM public.users
  WHERE id NOT IN (SELECT id FROM auth.users);

  -- Delete orphaned users
  DELETE FROM public.users
  WHERE id NOT IN (SELECT id FROM auth.users);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % orphaned users from public.users: %', deleted_count, deleted_emails;
  ELSE
    RAISE NOTICE 'No orphaned users to delete from public.users';
  END IF;
END $$;

-- Step 5: CLEANUP - Remove orphaned organization_members (user_id not in auth.users)
DO $$
DECLARE
  deleted_members INTEGER;
BEGIN
  DELETE FROM organization_members
  WHERE user_id NOT IN (SELECT id FROM auth.users);

  GET DIAGNOSTICS deleted_members = ROW_COUNT;

  IF deleted_members > 0 THEN
    RAISE NOTICE 'Deleted % orphaned organization_members', deleted_members;
  ELSE
    RAISE NOTICE 'No orphaned organization_members to delete';
  END IF;
END $$;

-- Step 6: FIX - Set invited_by to NULL where user doesn't exist
DO $$
BEGIN
  -- Fix organization_invitations
  UPDATE organization_invitations
  SET invited_by = NULL
  WHERE invited_by IS NOT NULL
    AND invited_by NOT IN (SELECT id FROM auth.users);

  -- Fix organization_members
  UPDATE organization_members
  SET invited_by = NULL
  WHERE invited_by IS NOT NULL
    AND invited_by NOT IN (SELECT id FROM auth.users);

  RAISE NOTICE 'Fixed invited_by references';
END $$;

-- Step 7: Recreate constraints properly
DO $$
BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

  ALTER TABLE public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

  ALTER TABLE public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

  ALTER TABLE organization_invitations
    ADD CONSTRAINT organization_invitations_invited_by_fkey
      FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

  ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

  ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_invited_by_fkey
      FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

  RAISE NOTICE 'Recreated all constraints';
END $$;

-- Step 8: Drop old triggers and functions
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_organization_for_user() CASCADE;
DROP FUNCTION IF EXISTS handle_signup_with_invitation_check() CASCADE;
DROP FUNCTION IF EXISTS handle_invitation_only_signup() CASCADE;

-- Step 9: Create invitation-only signup function
CREATE OR REPLACE FUNCTION handle_invitation_only_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pending_invitation RECORD;
BEGIN
  RAISE NOTICE 'New signup attempt for email: %', NEW.email;

  -- Check for valid invitation
  SELECT * INTO pending_invitation
  FROM organization_invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Block if no invitation
  IF pending_invitation.id IS NULL THEN
    RAISE NOTICE 'No valid invitation found for email: %', NEW.email;
    RAISE EXCEPTION 'Registration is invitation-only. Please request an invitation from your organization administrator.';
  END IF;

  RAISE NOTICE 'Found valid invitation for: %', NEW.email;

  -- Create user in public.users
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = NOW();

  -- Add to organization
  INSERT INTO organization_members (
    organization_id, user_id, role, invited_by,
    invited_at, joined_at, is_active
  )
  VALUES (
    pending_invitation.organization_id, NEW.id, pending_invitation.role,
    pending_invitation.invited_by, pending_invitation.created_at, NOW(), true
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET is_active = true, joined_at = NOW();

  -- Mark invitation as accepted
  UPDATE organization_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = pending_invitation.id;

  RETURN NEW;
END;
$$;

-- Step 10: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_only_signup();

-- Step 11: Grant permissions
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO authenticated, service_role, postgres, anon;

COMMENT ON FUNCTION handle_invitation_only_signup() IS
  'Enforces invitation-only registration. Blocks signup without valid invitation.';

-- Step 12: Verify final state
DO $$
DECLARE
  auth_count INTEGER;
  public_count INTEGER;
  member_count INTEGER;
  pending_invitations INTEGER;
  trigger_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users;
  SELECT COUNT(*) INTO public_count FROM public.users;
  SELECT COUNT(*) INTO member_count FROM organization_members;
  SELECT COUNT(*) INTO pending_invitations FROM organization_invitations WHERE status = 'pending';

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'FINAL STATE (AFTER):';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'auth.users: %', auth_count;
  RAISE NOTICE 'public.users: % (should match auth.users)', public_count;
  RAISE NOTICE 'organization_members: %', member_count;
  RAISE NOTICE 'pending_invitations: %', pending_invitations;
  RAISE NOTICE 'Trigger installed: %', CASE WHEN trigger_exists THEN 'YES ✓' ELSE 'NO ✗' END;
  RAISE NOTICE '========================================';

  IF auth_count = public_count THEN
    RAISE NOTICE '✓ SUCCESS: auth.users and public.users are IN SYNC!';
  ELSE
    RAISE WARNING '✗ WARNING: User counts do not match!';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Setup complete! Invitation-only registration enforced.';
  RAISE NOTICE '========================================';
END $$;

-- Final summary
SELECT
  '✓ COMPLETE!' as status,
  'All data synchronized and cleaned' as message,
  'Invitation-only registration is now active' as note;
