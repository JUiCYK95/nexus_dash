-- =============================================
-- FIX INVITATION SIGNUP FLOW
-- =============================================

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_organization_for_user();

-- Create improved function that checks for invitations first
CREATE OR REPLACE FUNCTION create_organization_for_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  org_slug TEXT;
  pending_invitation RECORD;
BEGIN
  -- Check if user has any pending invitations
  SELECT * INTO pending_invitation
  FROM organization_invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- If invitation exists, accept it instead of creating new org
  IF pending_invitation.id IS NOT NULL THEN
    -- Add user to the organization from invitation
    INSERT INTO organization_members (organization_id, user_id, role, invited_by, invited_at, joined_at, is_active)
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
  END IF;

  -- No invitation found, create new organization as before
  -- Generate a unique slug from email
  org_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));

  -- Ensure slug is unique
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
    org_slug := org_slug || '-' || FLOOR(RANDOM() * 1000)::TEXT;
  END LOOP;

  -- Create organization
  INSERT INTO organizations (name, slug, subscription_plan, trial_ends_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)) || '''s Organization',
    org_slug,
    'starter',
    NOW() + INTERVAL '14 days'
  )
  RETURNING id INTO org_id;

  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role, joined_at, is_active)
  VALUES (org_id, NEW.id, 'owner', NOW(), true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER create_org_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_organization_for_user();

-- Add status column to organization_invitations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_invitations'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE organization_invitations
    ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired'));
  END IF;
END $$;

-- Add index for faster invitation lookups
CREATE INDEX IF NOT EXISTS idx_org_invitations_email_status
ON organization_invitations(LOWER(email), status)
WHERE status = 'pending';

-- Create function to manually accept invitation (for existing users)
CREATE OR REPLACE FUNCTION accept_organization_invitation(
  invitation_token TEXT
)
RETURNS JSON AS $$
DECLARE
  invitation RECORD;
  result JSON;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation
  FROM organization_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();

  -- Check if invitation exists and is valid
  IF invitation.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = invitation.organization_id
      AND user_id = auth.uid()
      AND is_active = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already a member of this organization'
    );
  END IF;

  -- Add user to organization
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    invited_by,
    invited_at,
    joined_at,
    is_active
  ) VALUES (
    invitation.organization_id,
    auth.uid(),
    invitation.role,
    invitation.invited_by,
    invitation.created_at,
    NOW(),
    true
  );

  -- Mark invitation as accepted
  UPDATE organization_invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = invitation.id;

  -- Return success with organization info
  SELECT json_build_object(
    'success', true,
    'organization_id', o.id,
    'organization_name', o.name,
    'role', invitation.role
  ) INTO result
  FROM organizations o
  WHERE o.id = invitation.organization_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_organization_invitation(TEXT) TO authenticated;

-- Create function to decline invitation
CREATE OR REPLACE FUNCTION decline_organization_invitation(
  invitation_token TEXT
)
RETURNS JSON AS $$
DECLARE
  invitation RECORD;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation
  FROM organization_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF invitation.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;

  -- Mark invitation as declined
  UPDATE organization_invitations
  SET status = 'declined'
  WHERE id = invitation.id;

  RETURN json_build_object(
    'success', true,
    'message', 'Invitation declined'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION decline_organization_invitation(TEXT) TO authenticated;

-- Create a job to expire old invitations (run manually or via cron)
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE organization_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_organization_for_user() IS 'Automatically creates organization or accepts invitation on user signup';
COMMENT ON FUNCTION accept_organization_invitation(TEXT) IS 'Accept an organization invitation for an existing user';
COMMENT ON FUNCTION decline_organization_invitation(TEXT) IS 'Decline an organization invitation';
COMMENT ON FUNCTION expire_old_invitations() IS 'Mark expired invitations as expired (should be run periodically)';
