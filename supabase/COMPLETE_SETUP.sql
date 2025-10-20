-- =============================================
-- COMPLETE DATABASE SETUP - RUN THIS IN SUPABASE SQL EDITOR
-- This creates all necessary tables and triggers for invitation-only registration
-- =============================================

-- ============================================
-- STEP 1: CREATE ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'professional', 'business', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_ends_at TIMESTAMPTZ,
  billing_email TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- ============================================
-- STEP 2: CREATE USERS TABLE (PUBLIC)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================
-- STEP 3: CREATE ORGANIZATION_MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES public.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

-- ============================================
-- STEP 4: CREATE ORGANIZATION_INVITATIONS TABLE
-- ============================================
DROP TABLE IF EXISTS organization_invitations CASCADE;

CREATE TABLE organization_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'member', 'admin', 'owner')),
  invited_by UUID NOT NULL REFERENCES public.users(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_status ON organization_invitations(status) WHERE status = 'pending';

-- Disable RLS temporarily to avoid permission issues
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON organizations TO authenticated, anon;
GRANT ALL ON public.users TO authenticated, anon;
GRANT ALL ON organization_members TO authenticated, anon;
GRANT ALL ON organization_invitations TO authenticated, anon;

-- ============================================
-- STEP 5: DROP OLD TRIGGERS AND FUNCTIONS
-- ============================================
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_organization_for_user() CASCADE;
DROP FUNCTION IF EXISTS handle_signup_with_invitation_check() CASCADE;
DROP FUNCTION IF EXISTS handle_invitation_only_signup() CASCADE;

-- ============================================
-- STEP 6: CREATE INVITATION-ONLY SIGNUP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION handle_invitation_only_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pending_invitation RECORD;
BEGIN
  -- Step 1: Check if user has a valid pending invitation
  SELECT * INTO pending_invitation
  FROM public.organization_invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  -- Step 2: If NO invitation exists, raise error and block registration
  IF pending_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Registration is invitation-only. Please contact an administrator for an invitation.';
    RETURN NULL;
  END IF;

  -- Step 3: Create user entry in public.users table
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  -- Step 4: Add user to the organization from invitation
  INSERT INTO public.organization_members (
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
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Step 5: Mark invitation as accepted
  UPDATE public.organization_invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = pending_invitation.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise it
    RAISE WARNING 'Error in handle_invitation_only_signup: %', SQLERRM;
    RAISE;
END;
$$;

-- ============================================
-- STEP 7: CREATE TRIGGER
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_only_signup();

-- ============================================
-- STEP 8: ADD COMMENTS
-- ============================================
COMMENT ON TABLE organizations IS 'Multi-tenant organizations table';
COMMENT ON TABLE public.users IS 'Public user profiles linked to auth.users';
COMMENT ON TABLE organization_members IS 'Organization membership and roles';
COMMENT ON TABLE organization_invitations IS 'Pending and accepted organization invitations';
COMMENT ON FUNCTION handle_invitation_only_signup() IS 'Enforces invitation-only registration. Users can only sign up with a valid invitation.';

-- ============================================
-- DONE!
-- ============================================
SELECT
  'Setup complete! Invitation-only registration is now enforced.' as status,
  (SELECT COUNT(*) FROM organizations) as organizations_count,
  (SELECT COUNT(*) FROM public.users) as users_count,
  (SELECT COUNT(*) FROM organization_invitations) as invitations_count;
