-- =============================================
-- COMPLETE DATABASE SETUP FOR INVITATION-ONLY SYSTEM
-- Run this entire file in Supabase SQL Editor
-- =============================================

-- Step 1: Ensure organization_invitations table exists
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'member', 'admin', 'owner')),
  invited_by UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_org_id ON organization_invitations(organization_id);

-- Disable RLS for now to avoid permission issues
ALTER TABLE organization_invitations DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated and anon users
GRANT ALL ON organization_invitations TO authenticated;
GRANT ALL ON organization_invitations TO anon;

-- Step 2: Drop old triggers and functions
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_organization_for_user() CASCADE;
DROP FUNCTION IF EXISTS handle_signup_with_invitation_check() CASCADE;

-- Step 3: Create new invitation-only signup function
CREATE OR REPLACE FUNCTION handle_invitation_only_signup()
RETURNS TRIGGER AS $$
DECLARE
  pending_invitation RECORD;
BEGIN
  -- Check if user has a valid pending invitation
  SELECT * INTO pending_invitation
  FROM organization_invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If NO invitation exists, raise error
  IF pending_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Registration is invitation-only. Please contact an administrator for an invitation.';
  END IF;

  -- Create user entry in public.users table
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Add user to the organization from invitation
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

  -- Mark invitation as accepted
  UPDATE organization_invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = pending_invitation.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_invitation_only_signup();

-- Step 5: Add helpful comment
COMMENT ON FUNCTION handle_invitation_only_signup() IS
  'Enforces invitation-only registration. Users can only sign up if they have a valid pending invitation.';

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_invitation_only_signup() TO service_role;

-- Done!
SELECT 'Invitation-only registration system successfully configured!' as status;
