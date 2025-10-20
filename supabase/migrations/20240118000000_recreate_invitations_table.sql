-- =============================================
-- RECREATE ORGANIZATION INVITATIONS TABLE
-- =============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Organization members can view invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Organization admins can create invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Organization admins can update invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Public can access invitations by token" ON organization_invitations;

-- Drop existing table if it exists
DROP TABLE IF EXISTS organization_invitations CASCADE;

-- Create invitations table
CREATE TABLE organization_invitations (
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
CREATE INDEX idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX idx_organization_invitations_org_id ON organization_invitations(organization_id);

-- Disable RLS for now to avoid permission issues
ALTER TABLE organization_invitations DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated and anon users
GRANT ALL ON organization_invitations TO authenticated;
GRANT ALL ON organization_invitations TO anon;

SELECT 'Organization invitations table recreated successfully' as status;