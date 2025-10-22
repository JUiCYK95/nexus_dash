-- =============================================
-- FIX JOINED_AT FIELD WITH DEFAULT VALUE
-- =============================================

-- Add default value for joined_at column
ALTER TABLE organization_members
  ALTER COLUMN joined_at SET DEFAULT NOW();

-- Update existing NULL joined_at values to created_at
UPDATE organization_members
SET joined_at = COALESCE(joined_at, created_at, NOW())
WHERE joined_at IS NULL;

-- Make joined_at NOT NULL after setting defaults
ALTER TABLE organization_members
  ALTER COLUMN joined_at SET NOT NULL;

COMMENT ON COLUMN organization_members.joined_at IS 'Date when user joined the organization (defaults to NOW())';

SELECT 'joined_at field fixed with default value' as status;
