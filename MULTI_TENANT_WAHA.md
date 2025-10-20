# 🏢 Multi-Tenant WAHA Setup - Pro Kunde eine WAHA Instanz

**Status**: ✅ Implementiert | 🚀 Production Ready

---

## 🎯 Konzept

Jede Kundenorganisation hat ihre **eigene WAHA-Instanz** mit individueller URL:
- Kunde A: `https://kunde-a.up.railway.app`
- Kunde B: `https://kunde-b.up.railway.app`
- Kunde C: `https://kunde-c.up.railway.app`

Die WAHA URL wird **pro Organisation in der Datenbank gespeichert** und automatisch verwendet.

---

## 🗄️ Datenbank-Schema

### Neue Spalten in `organizations` Tabelle

```sql
ALTER TABLE organizations
  ADD COLUMN waha_api_url TEXT,
  ADD COLUMN waha_api_key TEXT,
  ADD COLUMN waha_session_name TEXT DEFAULT 'default';
```

**Beispiel-Daten:**
```sql
-- Organisation 1
waha_api_url: 'https://acme-corp.up.railway.app'
waha_api_key: 'secret_key_123'
waha_session_name: 'default'

-- Organisation 2
waha_api_url: 'https://techstart-gmbh.up.railway.app'
waha_api_key: 'secret_key_456'
waha_session_name: 'default'
```

### Migration ausführen

```bash
# In Supabase Dashboard: SQL Editor
# Datei öffnen: supabase/migrations/20240119000000_add_waha_config.sql
# Ausführen
```

Oder via Supabase CLI:
```bash
supabase migration up
```

---

## 🔧 Implementierung

### 1. WAHA Client (lib/waha-client.ts)

**Neue Funktion:**
```typescript
WAHAClient.forOrganization(organizationId: string): Promise<WAHAClient>
```

**Funktionsweise:**
1. Liest `waha_api_url` und `waha_api_key` aus Supabase
2. Erstellt WAHA Client mit Organization-spezifischer URL
3. Wirft Error falls WAHA URL nicht konfiguriert

**Beispiel:**
```typescript
// Holt automatisch die WAHA URL der Organisation
const wahaClient = await WAHAClient.forOrganization(organizationId)

// Verwendet dann die organization-spezifische URL
await wahaClient.sendTextMessage('default', '+49123456789', 'Hallo')
```

### 2. API Routes

Alle WhatsApp API Routes wurden angepasst:

**`/api/whatsapp/qr-code`**
```typescript
// 1. User authentifizieren
const { data: { user } } = await supabase.auth.getUser()

// 2. Organization ID holen
const { data: membership } = await supabase
  .from('organization_members')
  .select('organization_id')
  .eq('user_id', user.id)
  .single()

// 3. Organization-spezifischen WAHA Client erstellen
const wahaClient = await WAHAClient.forOrganization(membership.organization_id)

// 4. WAHA API Call (verwendet automatisch richtige URL)
const qrData = await wahaClient.getQRCode(sessionName)
```

**Angepasste Routes:**
- ✅ `/api/whatsapp/qr-code` - QR Code abrufen
- ✅ `/api/whatsapp/create-session` - Session erstellen
- ✅ `/api/whatsapp/session-status` - Status prüfen
- ✅ `/api/whatsapp/send-message` - Nachricht senden

### 3. Helper Functions (Supabase)

**WAHA URL abrufen:**
```sql
SELECT get_organization_waha_url('org-uuid-here');
-- Returns: 'https://kunde.up.railway.app'
```

**WAHA URL setzen (nur Owner):**
```sql
SELECT set_organization_waha_url(
  'org-uuid-here',
  'https://neue-url.up.railway.app',
  'new_api_key',
  'default'
);
```

---

## 🚀 Setup für neuen Kunden

### Schritt 1: WAHA Instanz deployen

**Option A: Railway (Empfohlen)**

```bash
# 1. Railway CLI installieren
npm i -g @railway/cli

# 2. Login
railway login

# 3. Neues Projekt erstellen
railway init

# 4. WAHA deployen
railway up --image devlikeapro/waha:latest

# 5. Environment Variables setzen
railway variables set WHATSAPP_API_KEY=kunde_secret_123
railway variables set WHATSAPP_SWAGGER_ENABLED=true

# 6. Custom Domain (optional)
# Railway Dashboard → Settings → Generate Domain
# Oder: Custom Domain verbinden
```

**Option B: Render**
```yaml
# render.yaml
services:
  - type: web
    name: waha-kunde-a
    env: docker
    dockerImage: devlikeapro/waha:latest
    envVars:
      - key: WHATSAPP_API_KEY
        generateValue: true
```

**Option C: Fly.io**
```bash
fly launch --image devlikeapro/waha:latest --name waha-kunde-a
fly secrets set WHATSAPP_API_KEY=kunde_secret_123
```

### Schritt 2: URL in Datenbank eintragen

**Via Supabase SQL Editor:**
```sql
-- WAHA Config für Organisation setzen
UPDATE organizations
SET
  waha_api_url = 'https://kunde-a.up.railway.app',
  waha_api_key = 'kunde_secret_123',
  waha_session_name = 'default',
  updated_at = NOW()
WHERE slug = 'kunde-a';  -- Oder WHERE id = 'uuid'

-- Prüfen
SELECT name, waha_api_url, waha_session_name
FROM organizations
WHERE slug = 'kunde-a';
```

**Via API (für Admin Panel):**
```typescript
// POST /api/organizations/[id]/waha-config
{
  "waha_api_url": "https://kunde-a.up.railway.app",
  "waha_api_key": "kunde_secret_123",
  "waha_session_name": "default"
}
```

### Schritt 3: Testen

```bash
# 1. Als Kunde einloggen
# 2. Dashboard → Settings

# 3. Session erstellen
POST /api/whatsapp/create-session
{
  "sessionName": "default"
}

# 4. QR Code abrufen
GET /api/whatsapp/qr-code?session=default

# 5. Mit WhatsApp scannen

# 6. Nachricht senden (Test)
POST /api/whatsapp/send-message
{
  "phoneNumber": "+49123456789",
  "message": "Test von WAHA!"
}
```

---

## 🔍 Troubleshooting

### Problem: "WAHA API URL not configured"

**Ursache:** Organization hat noch keine WAHA URL

**Lösung:**
```sql
-- URL setzen
UPDATE organizations
SET waha_api_url = 'https://kunde.up.railway.app',
    waha_api_key = 'secret_key'
WHERE id = 'organization-uuid';
```

### Problem: "Failed to get WAHA configuration"

**Ursache:** User ist in keiner Organization

**Lösung:**
```sql
-- Prüfe Organization Membership
SELECT * FROM organization_members
WHERE user_id = 'user-uuid';

-- Falls leer: User zu Organization hinzufügen
INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
VALUES ('org-uuid', 'user-uuid', 'owner', true, NOW());
```

### Problem: WAHA Instance nicht erreichbar

**Diagnose:**
```bash
# 1. Health Check
curl https://kunde.up.railway.app/api/server/health

# 2. Mit API Key
curl https://kunde.up.railway.app/api/sessions \
  -H "Authorization: Bearer kunde_secret_123"

# 3. Railway Logs
railway logs

# 4. Container Status
railway status
```

**Lösungen:**
- ✅ Railway Service neu starten
- ✅ API Key prüfen
- ✅ Domain DNS prüfen
- ✅ Firewall/Network prüfen

---

## 📊 Monitoring & Management

### WAHA Health Check Endpoint

```typescript
// GET /api/organizations/[id]/waha/health
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const wahaClient = await WAHAClient.forOrganization(params.id)

  try {
    const response = await fetch(`${wahaClient.baseURL}/api/server/health`)
    return NextResponse.json({
      status: response.ok ? 'healthy' : 'unhealthy',
      url: wahaClient.baseURL
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unreachable',
      error: error.message
    }, { status: 503 })
  }
}
```

### Alle Organization WAHA URLs anzeigen

```sql
SELECT
  o.name AS organization_name,
  o.slug AS organization_slug,
  o.waha_api_url,
  o.waha_session_name,
  CASE
    WHEN o.waha_api_key IS NOT NULL THEN 'Configured'
    ELSE 'Missing'
  END AS api_key_status,
  COUNT(om.id) AS member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id AND om.is_active = true
GROUP BY o.id, o.name, o.slug, o.waha_api_url, o.waha_session_name, o.waha_api_key
ORDER BY o.created_at DESC;
```

### Bulk WAHA URL Update (für Migration)

```sql
-- Beispiel: Alle Organizations mit pattern
UPDATE organizations
SET waha_api_url = 'https://' || slug || '.up.railway.app'
WHERE waha_api_url IS NULL;
```

---

## 🔒 Security Best Practices

### 1. API Key Verschlüsselung

**Empfohlen:** API Keys in Supabase verschlüsseln

```sql
-- Verschlüsselung aktivieren (optional)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- API Key encrypted speichern
UPDATE organizations
SET waha_api_key = crypt('plain_api_key', gen_salt('bf'))
WHERE id = 'org-uuid';
```

### 2. RLS Policies

**Bereits implementiert:**
```sql
-- Users sehen nur ihre Organization WAHA Config
CREATE POLICY "Users can view their organization WAHA config" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
```

### 3. Audit Logging

**Automatisch geloggt bei WAHA Config Änderungen:**
```sql
SELECT * FROM audit_logs
WHERE action = 'waha_config_updated'
ORDER BY created_at DESC;
```

---

## 💰 Cost Estimation

**Pro Kunde:**
- **Railway**: ~$5-10/Monat (Starter Plan)
- **Render**: ~$7/Monat (Starter)
- **Fly.io**: ~$3-5/Monat (Shared CPU)

**Bei 100 Kunden:**
- Railway: $500-1000/Monat
- Alternative: Eigener Server mit Docker Compose

**Optimierung:**
- Shared WAHA Server mit Session-Isolation (komplexer)
- Volume-basierte Preise verhandeln

---

## 🎯 Deployment Automation

### Script für neue Kunden

```bash
#!/bin/bash
# deploy-customer-waha.sh

CUSTOMER_NAME=$1
API_KEY=$(openssl rand -base64 32)

# 1. Deploy WAHA
railway up --image devlikeapro/waha:latest --name "waha-$CUSTOMER_NAME"
railway variables set WHATSAPP_API_KEY="$API_KEY"

# 2. Get URL
WAHA_URL=$(railway status --json | jq -r '.url')

# 3. Update Supabase
psql $DATABASE_URL -c "
  UPDATE organizations
  SET waha_api_url = '$WAHA_URL',
      waha_api_key = '$API_KEY'
  WHERE slug = '$CUSTOMER_NAME';
"

echo "✅ WAHA deployed for $CUSTOMER_NAME"
echo "   URL: $WAHA_URL"
echo "   API Key: $API_KEY"
```

**Usage:**
```bash
./deploy-customer-waha.sh kunde-a
./deploy-customer-waha.sh kunde-b
```

---

## ✅ Checkliste pro Kunde

**WAHA Setup:**
- [ ] Railway/Render Projekt erstellt
- [ ] WAHA Image deployed
- [ ] API Key generiert
- [ ] Domain konfiguriert (optional)
- [ ] Health Check erfolgreich

**Datenbank:**
- [ ] Organization existiert
- [ ] `waha_api_url` gesetzt
- [ ] `waha_api_key` gesetzt
- [ ] `waha_session_name` konfiguriert

**Testing:**
- [ ] Session erstellen funktioniert
- [ ] QR Code wird angezeigt
- [ ] WhatsApp Scan erfolgreich
- [ ] Nachricht senden funktioniert
- [ ] Webhook empfängt Events

**Monitoring:**
- [ ] Health Check Endpoint funktioniert
- [ ] Logs sind zugänglich
- [ ] Alert bei Ausfall (optional)

---

## 🔄 Migration von Single zu Multi-Tenant

**Falls du bereits ein WAHA hast:**

```bash
# 1. Migration ausführen
# supabase/migrations/20240119000000_add_waha_config.sql

# 2. Existierende WAHA URL für alle Organizations setzen
UPDATE organizations
SET waha_api_url = 'https://botzimmerwa-production.up.railway.app',
    waha_api_key = ']Sc(QfQPM<^ZZ!C4sk|:(Ias&"^zs5'
WHERE waha_api_url IS NULL;

# 3. Schrittweise eigene WAHA Instanzen deployen
# 4. URLs pro Organization aktualisieren
```

---

## 📚 Zusammenfassung

**Was funktioniert jetzt:**

✅ **Jede Organization hat eigene WAHA URL**
- Gespeichert in `organizations.waha_api_url`
- Automatisch verwendet bei allen API Calls

✅ **WAHA Client ist Multi-Tenant**
- `WAHAClient.forOrganization(id)` erstellt client mit richtiger URL
- Backward compatible mit env vars

✅ **Alle API Routes angepasst**
- Automatische Organization-Detection
- Verwendet organization-spezifische WAHA URL
- Fehlerbehandlung bei fehlender Config

✅ **Security & Permissions**
- RLS Policies aktiv
- Nur Owner kann WAHA Config ändern
- Audit Logging

✅ **Production Ready**
- Build erfolgreich
- Migration erstellt
- Dokumentation komplett

**Was du tun musst:**

1. Migration in Supabase ausführen
2. Pro Kunde WAHA auf Railway/Render deployen
3. WAHA URLs in Datenbank eintragen
4. Testen!

**Perfekt für SaaS mit vielen Kunden! 🚀**
