-- =============================================
-- FIX REGISTRATION FLOW WITH PROPER RLS
-- =============================================

-- Re-enable RLS with proper policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can access organizations" ON organizations;
DROP POLICY IF EXISTS "Users can access memberships" ON organization_members;

-- Create secure but functional RLS policies for organizations
CREATE POLICY "Users can read their organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid() 
      AND role = 'owner'
      AND is_active = true
    )
  );

-- Create secure but functional RLS policies for organization_members
CREATE POLICY "Users can read their memberships" ON organization_members
  FOR SELECT USING (user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  );

CREATE POLICY "Users can create their own membership" ON organization_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organization admins can manage memberships" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om 
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  );

-- Re-enable the trigger for automatic organization creation
CREATE OR REPLACE FUNCTION create_organization_for_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Only create organization if user doesn't already have one
  IF EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = NEW.id AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;
  
  org_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Organization');
  org_slug := 'org-' || replace(NEW.id::text, '-', '');
  
  -- Create organization
  INSERT INTO organizations (name, slug, subscription_plan, subscription_status)
  VALUES (org_name, org_slug, 'starter', 'trialing')
  RETURNING id INTO org_id;
  
  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
  VALUES (org_id, NEW.id, 'owner', true, NOW());
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create organization for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Re-create the trigger
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
CREATE TRIGGER create_org_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_organization_for_user();

SELECT 'Registration flow fixed with proper RLS and trigger' as status;