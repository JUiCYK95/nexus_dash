-- =============================================
-- ENFORCE INVITATION-ONLY REGISTRATION
-- No more automatic organization creation
-- Users can ONLY register with a valid invitation
-- =============================================

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_organization_for_user() CASCADE;
DROP FUNCTION IF EXISTS handle_signup_with_invitation_check() CASCADE;

-- Create new function that ONLY allows registration with valid invitation
CREATE OR REPLACE FUNCTION handle_invitation_only_signup()
RETURNS TRIGGER AS $$
DECLARE
  pending_invitation RECORD;
BEGIN
  -- Step 1: Check if user has a valid pending invitation
  SELECT * INTO pending_invitation
  FROM organization_invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Step 2: If NO invitation exists, raise error
  IF pending_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Registration is invitation-only. Please contact an administrator for an invitation.';
  END IF;

  -- Step 3: Create user entry in public.users table
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  -- Step 4: Add user to the organization from invitation
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
  );

  -- Step 5: Mark invitation as accepted
  UPDATE organization_invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = pending_invitation.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_invitation_only_signup();

-- Add helpful comment
COMMENT ON FUNCTION handle_invitation_only_signup() IS
  'Enforces invitation-only registration. Users can only sign up if they have a valid pending invitation.';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO service_role;
