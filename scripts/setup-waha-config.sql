-- =============================================
-- WAHA CONFIGURATION SETUP
-- Führe dies NACH der Migration aus
-- =============================================

-- 1. PRÜFE OB MIGRATION ERFOLGREICH WAR
-- Sollte 3 neue Spalten zeigen: waha_api_url, waha_api_key, waha_session_name
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name LIKE 'waha%'
ORDER BY column_name;

-- 2. ZEIGE ALLE ORGANIZATIONS (für Referenz)
SELECT
  id,
  name,
  slug,
  waha_api_url,
  waha_session_name,
  CASE
    WHEN waha_api_key IS NOT NULL THEN '✓ Configured'
    ELSE '✗ Not Set'
  END as api_key_status,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- =============================================
-- BEISPIEL: WAHA URL FÜR EINE ORGANIZATION SETZEN
-- =============================================

-- Option A: Direkt via UPDATE (ersetze die Werte!)
/*
UPDATE organizations
SET
  waha_api_url = 'https://botzimmerwa-production.up.railway.app',
  waha_api_key = ']Sc(QfQPM<^ZZ!C4sk|:(Ias&"^zs5',
  waha_session_name = 'default',
  updated_at = NOW()
WHERE slug = 'DEIN-ORGANIZATION-SLUG';  -- Oder: WHERE id = 'organization-uuid'
*/

-- Option B: Via Function (sicherer, prüft Permissions)
/*
SELECT set_organization_waha_url(
  'ORGANIZATION-UUID'::uuid,                           -- Organization ID
  'https://botzimmerwa-production.up.railway.app',     -- WAHA URL
  ']Sc(QfQPM<^ZZ!C4sk|:(Ias&"^zs5',                    -- API Key
  'default'                                            -- Session Name
);
*/

-- =============================================
-- BULK UPDATE: ALLE ORGANIZATIONS MIT GLEICHER WAHA URL
-- Nur verwenden wenn ALLE Kunden die gleiche WAHA Instanz nutzen
-- =============================================
/*
UPDATE organizations
SET
  waha_api_url = 'https://botzimmerwa-production.up.railway.app',
  waha_api_key = ']Sc(QfQPM<^ZZ!C4sk|:(Ias&"^zs5',
  waha_session_name = 'default',
  updated_at = NOW()
WHERE waha_api_url IS NULL;
*/

-- =============================================
-- PATTERN: URL BASIEREND AUF ORGANIZATION SLUG
-- Nützlich wenn du pro Kunde eine WAHA Instanz hast
-- =============================================
/*
-- Beispiel: https://kunde-a.up.railway.app, https://kunde-b.up.railway.app, etc.
UPDATE organizations
SET
  waha_api_url = 'https://' || slug || '.up.railway.app',
  waha_session_name = 'default',
  updated_at = NOW()
WHERE waha_api_url IS NULL;

-- Dann API Keys manuell setzen pro Organization
UPDATE organizations
SET waha_api_key = 'API_KEY_FÜR_KUNDE_A'
WHERE slug = 'kunde-a';

UPDATE organizations
SET waha_api_key = 'API_KEY_FÜR_KUNDE_B'
WHERE slug = 'kunde-b';
*/

-- =============================================
-- VALIDIERUNG: PRÜFE CONFIGURATION
-- =============================================

-- Zeige alle Organizations mit WAHA Config Status
SELECT
  name,
  slug,
  waha_api_url,
  waha_session_name,
  CASE
    WHEN waha_api_key IS NOT NULL THEN '✓ API Key Set'
    ELSE '✗ API Key Missing'
  END as api_key_status,
  CASE
    WHEN waha_api_url IS NOT NULL THEN '✓ URL Set'
    ELSE '✗ URL Missing'
  END as url_status
FROM organizations
ORDER BY created_at DESC;

-- Prüfe ob Functions erstellt wurden
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%waha%'
ORDER BY routine_name;

-- Prüfe ob View erstellt wurde
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'organization_waha_config';

-- =============================================
-- TEST: WAHA URL ABRUFEN
-- =============================================

-- Teste get_organization_waha_url function
/*
SELECT get_organization_waha_url('ORGANIZATION-UUID'::uuid);
*/

-- Zeige Organization WAHA Config via View
SELECT * FROM organization_waha_config
ORDER BY organization_name;

-- =============================================
-- AUDIT: ZEIGE WAHA CONFIG ÄNDERUNGEN
-- =============================================

SELECT
  al.created_at,
  o.name as organization,
  u.email as changed_by,
  al.details
FROM audit_logs al
JOIN organizations o ON al.organization_id = o.id
LEFT JOIN auth.users u ON al.user_id = u.id
WHERE al.action = 'waha_config_updated'
ORDER BY al.created_at DESC
LIMIT 10;

-- =============================================
-- CLEANUP (OPTIONAL): FALLS DU NEU ANFANGEN WILLST
-- =============================================
/*
-- Vorsicht! Dies löscht alle WAHA Konfigurationen
UPDATE organizations
SET
  waha_api_url = NULL,
  waha_api_key = NULL,
  waha_session_name = 'default';
*/
