# 🚀 WAHA Multi-Tenant Migration - Step by Step Guide

**Ziel**: WAHA URLs pro Organization in der Datenbank speichern

---

## ✅ Schritt 1: Migration in Supabase ausführen

### Option A: Supabase Dashboard (Empfohlen)

1. **Öffne Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ijbrtnxhtojmnfavhrpx/sql
   ```

2. **Klicke auf "New Query"**

3. **Kopiere den kompletten Inhalt von:**
   ```
   supabase/migrations/20240119000000_add_waha_config.sql
   ```

4. **Füge ihn in den SQL Editor ein**

5. **Klicke "Run"**

6. **Erwartete Ausgabe:**
   ```
   Success! No rows returned
   ```

### Option B: Supabase CLI

```bash
# Falls Supabase CLI installiert ist
cd /Users/justin/Desktop/Test
supabase db push

# Oder spezifische Migration
supabase db remote commit
```

---

## ✅ Schritt 2: Validierung

**Führe diese Queries in Supabase SQL Editor aus:**

```sql
-- 1. Prüfe neue Spalten
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations'
  AND column_name LIKE 'waha%';

-- Sollte zeigen:
-- waha_api_url      | text
-- waha_api_key      | text
-- waha_session_name | text

-- 2. Prüfe Functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%waha%';

-- Sollte zeigen:
-- get_organization_waha_url
-- set_organization_waha_url

-- 3. Prüfe View
SELECT * FROM organization_waha_config LIMIT 1;
```

**Wenn alles OK ist → Weiter zu Schritt 3**

---

## ✅ Schritt 3: WAHA URLs konfigurieren

### Szenario A: EINE gemeinsame WAHA Instanz für alle

**Wenn alle Kunden die gleiche WAHA nutzen:**

```sql
-- Setze für ALLE Organizations
UPDATE organizations
SET
  waha_api_url = 'https://botzimmerwa-production.up.railway.app',
  waha_api_key = ']Sc(QfQPM<^ZZ!C4sk|:(Ias&"^zs5',
  waha_session_name = 'default',
  updated_at = NOW()
WHERE waha_api_url IS NULL;

-- Validierung
SELECT name, waha_api_url FROM organizations;
```

### Szenario B: Jeder Kunde hat eigene WAHA Instanz

**Wenn du pro Kunde eine WAHA deployed hast:**

```sql
-- Beispiel Kunde A
UPDATE organizations
SET
  waha_api_url = 'https://kunde-a.up.railway.app',
  waha_api_key = 'api_key_kunde_a',
  waha_session_name = 'default'
WHERE slug = 'kunde-a';

-- Beispiel Kunde B
UPDATE organizations
SET
  waha_api_url = 'https://kunde-b.up.railway.app',
  waha_api_key = 'api_key_kunde_b',
  waha_session_name = 'default'
WHERE slug = 'kunde-b';

-- Oder alle auf einmal mit Pattern:
-- (Setzt URL basierend auf Organization slug)
UPDATE organizations
SET
  waha_api_url = 'https://' || slug || '.up.railway.app',
  waha_session_name = 'default'
WHERE waha_api_url IS NULL;

-- Dann API Keys manuell setzen
```

### Szenario C: Einzelne Organization konfigurieren

```sql
-- 1. Finde deine Organization
SELECT id, name, slug FROM organizations;

-- 2. Setze WAHA Config
UPDATE organizations
SET
  waha_api_url = 'https://botzimmerwa-production.up.railway.app',
  waha_api_key = ']Sc(QfQPM<^ZZ!C4sk|:(Ias&"^zs5',
  waha_session_name = 'default'
WHERE id = 'DEINE-ORG-UUID';  -- Oder WHERE slug = 'org-slug'
```

---

## ✅ Schritt 4: Testen

### 4.1 Prüfe Configuration

```sql
-- Zeige alle WAHA Configs
SELECT
  name,
  slug,
  waha_api_url,
  CASE
    WHEN waha_api_key IS NOT NULL THEN '✓ Set'
    ELSE '✗ Missing'
  END as api_key
FROM organizations;
```

### 4.2 Test WAHA Connection (via Dashboard)

1. **Logge dich als User einer Organization ein**

2. **Gehe zu Dashboard → Settings (oder Chat)**

3. **Teste Session Creation:**
   ```bash
   # Developer Tools → Network Tab
   # Klicke "Create Session" Button
   # API Call sollte gehen zu:
   POST /api/whatsapp/create-session

   # Response sollte zeigen:
   {
     "success": true,
     "session": {...}
   }
   ```

4. **Teste QR Code:**
   ```bash
   GET /api/whatsapp/qr-code?session=default

   # Sollte QR Code von der konfigurierten WAHA URL holen
   ```

### 4.3 Direct API Test

```bash
# Test mit curl (ersetze TOKEN mit echtem JWT)
curl -X GET 'http://localhost:3000/api/whatsapp/session-status?session=default' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# Expected Response:
{
  "success": true,
  "status": "WORKING", # oder "SCAN_QR_CODE" oder "FAILED"
  "name": "default"
}
```

---

## ✅ Schritt 5: Monitoring

### Setup Health Check

**Erstelle API Route (optional):**

```typescript
// app/api/admin/waha-health/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createClient()

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, waha_api_url')
    .not('waha_api_url', 'is', null)

  const healthChecks = await Promise.all(
    orgs.map(async (org) => {
      try {
        const response = await fetch(`${org.waha_api_url}/api/server/health`)
        return {
          organization: org.name,
          url: org.waha_api_url,
          status: response.ok ? 'healthy' : 'unhealthy'
        }
      } catch (error) {
        return {
          organization: org.name,
          url: org.waha_api_url,
          status: 'unreachable',
          error: error.message
        }
      }
    })
  )

  return NextResponse.json({ healthChecks })
}
```

**Usage:**
```bash
curl http://localhost:3000/api/admin/waha-health
```

---

## 🔍 Troubleshooting

### Problem: "WAHA API URL not configured"

**Ursache:** Organization hat keine `waha_api_url` gesetzt

**Lösung:**
```sql
-- Setze URL für die Organization
UPDATE organizations
SET waha_api_url = 'https://deine-waha-url.com'
WHERE slug = 'organization-slug';
```

### Problem: "Failed to get WAHA configuration"

**Ursache:** User ist in keiner Organization

**Lösung:**
```sql
-- Prüfe Membership
SELECT * FROM organization_members WHERE user_id = 'USER-UUID';

-- Füge User zu Organization hinzu
INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
VALUES ('ORG-UUID', 'USER-UUID', 'owner', true, NOW());
```

### Problem: WAHA Connection Timeout

**Diagnose:**
```bash
# 1. Teste WAHA direkt
curl https://botzimmerwa-production.up.railway.app/api/server/health

# 2. Teste mit API Key
curl https://botzimmerwa-production.up.railway.app/api/sessions \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Lösungen:**
- Railway Service neu starten
- API Key prüfen
- URL in DB prüfen (`SELECT waha_api_url FROM organizations`)

### Problem: RLS Policy Block

**Symptom:** "permission denied for table organizations"

**Lösung:**
```sql
-- Prüfe ob Policy existiert
SELECT policyname FROM pg_policies WHERE tablename = 'organizations';

-- Falls Policy fehlt:
CREATE POLICY "Users can view their organization WAHA config" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

---

## 📋 Checkliste

Nach der Migration solltest du haben:

**Datenbank:**
- [ ] ✅ Spalten: `waha_api_url`, `waha_api_key`, `waha_session_name` existieren
- [ ] ✅ Functions: `get_organization_waha_url`, `set_organization_waha_url` erstellt
- [ ] ✅ View: `organization_waha_config` verfügbar
- [ ] ✅ Index: `idx_organizations_waha_url` erstellt

**Configuration:**
- [ ] ✅ Mindestens eine Organization hat `waha_api_url` gesetzt
- [ ] ✅ `waha_api_key` ist konfiguriert
- [ ] ✅ `waha_session_name` ist gesetzt (default: 'default')

**Testing:**
- [ ] ✅ Session kann erstellt werden
- [ ] ✅ QR Code wird geladen
- [ ] ✅ Nachricht kann gesendet werden
- [ ] ✅ Health Check funktioniert

---

## 🎯 Next Steps nach erfolgreicher Migration

1. **Production Build testen:**
   ```bash
   npm run build
   npm start
   ```

2. **Auf Vercel deployen:**
   ```bash
   vercel --prod
   ```

3. **Environment Variables checken:**
   - Falls du Fallback brauchst: `WAHA_API_URL` und `WAHA_API_KEY` in Vercel setzen

4. **Monitoring aktivieren:**
   - Health Checks für alle WAHA Instanzen
   - Alerts bei Ausfällen

5. **Dokumentation für Team:**
   - Wie neue WAHA Instanz für Kunde deployen
   - Wie WAHA URL in DB eintragen
   - Troubleshooting Guide teilen

---

## 💡 Nützliche SQL Queries

```sql
-- Alle Organizations mit WAHA Status
SELECT
  name,
  slug,
  waha_api_url,
  CASE WHEN waha_api_key IS NOT NULL THEN '✓' ELSE '✗' END as key,
  (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id AND om.is_active = true) as members
FROM organizations o
ORDER BY created_at DESC;

-- Organizations ohne WAHA Config
SELECT name, slug
FROM organizations
WHERE waha_api_url IS NULL;

-- WAHA Config Änderungen (Audit Log)
SELECT
  created_at,
  o.name,
  u.email,
  details->>'waha_url' as url
FROM audit_logs al
JOIN organizations o ON al.organization_id = o.id
LEFT JOIN auth.users u ON al.user_id = u.id
WHERE action = 'waha_config_updated'
ORDER BY created_at DESC;
```

---

**Migration erfolgreich? → Teste die Integration und los geht's! 🚀**
