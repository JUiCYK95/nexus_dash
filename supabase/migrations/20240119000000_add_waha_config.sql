-- =============================================
-- ADD WAHA CONFIGURATION TO ORGANIZATIONS
-- =============================================

-- Add waha_api_url and waha_api_key columns to organizations table
-- Each organization gets its own WAHA instance URL (e.g., https://customer-name.up.railway.app)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS waha_api_url TEXT,
  ADD COLUMN IF NOT EXISTS waha_api_key TEXT,
  ADD COLUMN IF NOT EXISTS waha_session_name TEXT DEFAULT 'default';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_waha_url ON organizations(waha_api_url);

-- Add comment for documentation
COMMENT ON COLUMN organizations.waha_api_url IS 'Organization-specific WAHA API URL (e.g., https://customer-name.up.railway.app)';
COMMENT ON COLUMN organizations.waha_api_key IS 'API key for the organization WAHA instance (encrypted)';
COMMENT ON COLUMN organizations.waha_session_name IS 'Default WhatsApp session name for this organization';

-- Update settings JSONB structure to include WAHA config as alternative storage
-- This allows for storing additional WAHA-related settings
-- Example: {"waha": {"autoReconnect": true, "webhookEnabled": true}}

-- Create function to get organization WAHA URL
CREATE OR REPLACE FUNCTION get_organization_waha_url(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  waha_url TEXT;
BEGIN
  SELECT waha_api_url INTO waha_url
  FROM organizations
  WHERE id = org_id;

  RETURN waha_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set organization WAHA URL (admin only)
CREATE OR REPLACE FUNCTION set_organization_waha_url(
  org_id UUID,
  new_waha_url TEXT,
  new_waha_key TEXT DEFAULT NULL,
  new_session_name TEXT DEFAULT 'default'
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if current user is owner or admin of the organization
  SELECT role INTO user_role
  FROM organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true;

  -- Only owners can change WAHA config
  IF user_role != 'owner' THEN
    RAISE EXCEPTION 'Only organization owners can update WAHA configuration';
  END IF;

  -- Update WAHA configuration
  UPDATE organizations
  SET
    waha_api_url = new_waha_url,
    waha_api_key = COALESCE(new_waha_key, waha_api_key), -- Keep existing key if not provided
    waha_session_name = new_session_name,
    updated_at = NOW()
  WHERE id = org_id;

  -- Log the change
  INSERT INTO audit_logs (organization_id, user_id, action, details)
  VALUES (
    org_id,
    auth.uid(),
    'waha_config_updated',
    jsonb_build_object(
      'waha_url', new_waha_url,
      'session_name', new_session_name
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_organization_waha_url(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_organization_waha_url(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Add RLS policy for WAHA configuration access
-- Users can only see WAHA config for their own organizations
CREATE POLICY "Users can view their organization WAHA config" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create view for easy access to organization WAHA config
CREATE OR REPLACE VIEW organization_waha_config AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.slug AS organization_slug,
  o.waha_api_url,
  o.waha_session_name,
  -- Don't expose API key in view for security
  CASE
    WHEN o.waha_api_key IS NOT NULL THEN true
    ELSE false
  END AS has_waha_api_key,
  o.updated_at AS last_updated
FROM organizations o;

-- Grant select on view
GRANT SELECT ON organization_waha_config TO authenticated;

-- Add RLS for the view
ALTER VIEW organization_waha_config OWNER TO postgres;

COMMENT ON VIEW organization_waha_config IS 'View of organization WAHA configuration without exposing API keys';
