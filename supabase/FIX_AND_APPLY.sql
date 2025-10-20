-- =============================================
-- FIX INVITATION SYSTEM AND APPLY INVITATION-ONLY REGISTRATION
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Fix the public.users table to match auth.users properly
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key CASCADE;

-- Make sure public.users.id references auth.users.id
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_id_fkey,
  ADD CONSTRAINT users_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add primary key back
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Step 2: Fix organization_invitations foreign key
ALTER TABLE organization_invitations
  DROP CONSTRAINT IF EXISTS organization_invitations_invited_by_fkey;

-- Recreate with correct reference to auth.users
ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 3: Fix organization_members foreign keys
ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_invited_by_fkey;

ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 4: Drop old triggers and functions
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_organization_for_user() CASCADE;
DROP FUNCTION IF EXISTS handle_signup_with_invitation_check() CASCADE;
DROP FUNCTION IF EXISTS handle_invitation_only_signup() CASCADE;

-- Step 5: Create new invitation-only signup function
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

-- Step 6: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_only_signup();

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO service_role;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO postgres;

-- Step 8: Add comment
COMMENT ON FUNCTION handle_invitation_only_signup() IS
  'Enforces invitation-only registration. Blocks signup without valid invitation.';

-- Done!
SELECT
  'Setup complete!' as status,
  'Invitation-only registration is now enforced' as message,
  (SELECT COUNT(*) FROM organization_invitations WHERE status = 'pending') as pending_invitations;
