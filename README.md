# WhatsApp Dashboard - Umfassende Dokumentation

Ein modernes Multi-Tenant SaaS Dashboard für WhatsApp Business mit WAHA API Integration, Analytics, Super Admin Panel und Chat-Management.

**Version**: 1.0.0
**Status**: ✅ Production Ready
**Last Updated**: Oktober 2025

---

## 📑 Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Schnellstart](#schnellstart)
3. [Tech Stack](#tech-stack)
4. [Installation](#installation)
5. [Konfiguration](#konfiguration)
6. [Multi-Tenant Architektur](#multi-tenant-architektur)
7. [WAHA Integration](#waha-integration)
8. [Super Admin](#super-admin)
9. [Sicherheit](#sicherheit)
10. [API-Dokumentation](#api-dokumentation)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)
13. [Support](#support)

---

## 🚀 Überblick

### Features

- ✅ **Multi-Tenant Architektur** - Vollständige Mandantentrennung
- ✅ **WhatsApp Integration** - WAHA API für echte WhatsApp-Nachrichten
- ✅ **Real-time Chat** - Live Chat-Interface mit Nachrichtenverwaltung
- ✅ **Analytics Dashboard** - Detaillierte KPIs und Auswertungen
- ✅ **Super Admin Panel** - Verwaltung aller Organisationen und Benutzer
- ✅ **Stripe Integration** - Abonnements und Billing
- ✅ **Team Management** - Rollen, Einladungen und Berechtigungen
- ✅ **Kontakt-Management** - Suchfunktion und Kategorisierung
- ✅ **Responsive Design** - Optimiert für alle Geräte
- ✅ **Row Level Security** - Enterprise-Grade Datensicherheit

---

## ⚡ Schnellstart

### 1. Lokale Entwicklungsumgebung starten

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

Dashboard verfügbar unter: **http://localhost:3001**

### 2. Erste Schritte

#### Registrierung
1. Öffnen Sie **http://localhost:3001/register**
2. Erstellen Sie ein Benutzerkonto
3. Sie werden automatisch als Owner Ihrer Organisation eingerichtet

#### Dashboard erkunden
Nach der Anmeldung haben Sie Zugriff auf:
- 📊 **Dashboard** - KPIs und Übersicht (`/dashboard`)
- 💬 **Chat** - WhatsApp-Nachrichten (`/dashboard/chat`)
- 👥 **Kontakte** - Kontakt-Management (`/dashboard/contacts`)
- 📈 **Analytics** - Detaillierte Auswertungen (`/dashboard/analytics`)
- ⚙️ **Einstellungen** - WhatsApp-Verbindung & Team (`/dashboard/settings`)

### 3. WhatsApp verbinden (Optional)

```bash
# WAHA Docker Container starten
docker run -d \
  --name waha-whatsapp \
  -p 3000:3000 \
  -e WHATSAPP_SWAGGER_ENABLED=true \
  devlikeapro/waha

# Im Dashboard unter Settings → QR-Code scannen
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React Framework mit App Router
- **TypeScript** - Type-safe Development
- **Tailwind CSS** - Utility-first CSS
- **Recharts** - Data Visualization
- **Heroicons** - Icon Library
- **Framer Motion** - Animations

### Backend
- **Next.js API Routes** - Serverless Functions
- **Supabase** - PostgreSQL mit Row Level Security
- **Stripe** - Payment Processing
- **WAHA API** - WhatsApp HTTP API

### Infrastructure
- **Vercel** - Hosting & Deployment
- **Railway/Render** - WAHA Container Hosting
- **Supabase** - Database & Auth

---

## 📦 Installation

### Voraussetzungen

- **Node.js** 18 oder höher
- **npm** oder **yarn**
- **Docker** (für lokale WAHA-Entwicklung)
- **Supabase Account**
- **Stripe Account** (optional für Billing)

### Schritt 1: Repository klonen

```bash
git clone <repository-url>
cd whatsapp-dashboard
```

### Schritt 2: Dependencies installieren

```bash
npm install
```

### Schritt 3: Umgebungsvariablen konfigurieren

Kopieren Sie `.env.example` zu `.env.local`:

```bash
cp .env.example .env.local
```

Bearbeiten Sie `.env.local` mit Ihren Werten:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# WAHA API (optional)
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=your_api_key

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Next.js
NEXTAUTH_SECRET=your_random_secret
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Schritt 4: Datenbank Setup

1. Erstellen Sie ein Supabase-Projekt
2. Führen Sie alle Migrationen aus:

```bash
# Migrations befinden sich in: supabase/migrations/
# Öffnen Sie Supabase SQL Editor und führen Sie sie nacheinander aus
```

### Schritt 5: Development Server starten

```bash
npm run dev
```

---

## ⚙️ Konfiguration

### Datenbank-Migrationen

Die Migrationen befinden sich in `supabase/migrations/`:

- `20240101000000_add_multi_tenancy.sql` - Multi-Tenant Basis-Struktur
- `20240102000000_create_base_tables.sql` - Haupttabellen
- `20240119000000_add_waha_config.sql` - WAHA Konfiguration
- `20240120000000_add_super_admin.sql` - Super Admin System
- `20240123000000_fix_super_admin_rls.sql` - RLS Optimierungen

### Wichtige Datenbank-Tabellen

- **organizations** - Mandanten/Organisationen
- **organization_members** - Team-Mitgliedschaften
- **organization_invitations** - Einladungen
- **super_admins** - Super-Administrator Zugriff
- **whatsapp_contacts** - Kontakte
- **whatsapp_messages** - Nachrichtenverlauf
- **usage_tracking** - Nutzungsstatistiken

---

## 🏢 Multi-Tenant Architektur

### Konzept

Jede Organisation ist ein isolierter Mandant mit:
- **Eigenen Benutzern** - Vollständige Isolation
- **Eigener WAHA-Instanz** - Dedizierte WhatsApp-API
- **Eigenen Daten** - Row Level Security (RLS)
- **Eigenem Abonnement** - Stripe Subscriptions

### WAHA pro Organisation

Jede Organisation kann ihre eigene WAHA-Instanz konfigurieren:

```sql
-- WAHA Config in organizations Tabelle
waha_api_url: 'https://kunde-a.up.railway.app'
waha_api_key: 'secret_key_123'
waha_session_name: 'default'
```

### Organisation erstellen (Super Admin)

```typescript
// POST /api/super-admin/organizations
{
  "name": "Neue Organisation",
  "owner_email": "owner@example.com",
  "subscription_plan": "starter",
  "waha_api_url": "https://kunde.up.railway.app",
  "waha_api_key": "api_key_here"
}
```

### Automatische Slug-Generierung

- Name wird automatisch in URL-freundlichen Slug konvertiert
- Beispiel: "Meine Firma GmbH" → "meine-firma-gmbh"

---

## 📱 WAHA Integration

### Setup pro Kunde

#### Option A: Railway (Empfohlen)

```bash
# Railway CLI installieren
npm i -g @railway/cli

# Login
railway login

# WAHA deployen
railway init
railway up --image devlikeapro/waha:latest

# Environment Variables
railway variables set WHATSAPP_API_KEY=kunde_secret_123
```

#### Option B: Docker (Lokal)

```bash
docker run -d \
  --name waha-kunde-a \
  -p 3000:3000 \
  -e WHATSAPP_API_KEY=secret_key \
  -e WHATSAPP_SWAGGER_ENABLED=true \
  devlikeapro/waha
```

### WAHA URL in Datenbank eintragen

```sql
UPDATE organizations
SET
  waha_api_url = 'https://kunde-a.up.railway.app',
  waha_api_key = 'kunde_secret_123',
  waha_session_name = 'default'
WHERE slug = 'kunde-a';
```

### Session erstellen & QR-Code scannen

1. Dashboard → Einstellungen
2. "Neue Session erstellen"
3. "QR-Code abrufen"
4. Mit WhatsApp App scannen

---

## 👑 Super Admin

### Super Admin Dashboard

Zugriff: **http://localhost:3001/super-admin**

Features:
- **Organisations-Übersicht** - Alle Kunden verwalten
- **Benutzer-Verwaltung** - Super Admin Rechte vergeben
- **Statistiken** - System-weite Metriken
- **Audit Logs** - Vollständige Aktivitätsprotokolle

### Ersten Super Admin erstellen

#### Methode 1: Via Supabase SQL Editor

```sql
-- Ersetzen Sie die E-Mail mit Ihrer Admin-E-Mail
INSERT INTO super_admins (user_id, notes, is_active)
SELECT id, 'Initial super admin', true
FROM auth.users
WHERE email = 'admin@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

#### Methode 2: Via Node Script (falls vorhanden)

```bash
node scripts/init-super-admin.js
```

### Organisation erstellen (Super Admin)

1. Gehe zu `/super-admin/organizations`
2. Klicke "Neue Organisation"
3. Fülle das Formular aus:
   - **Name** (erforderlich)
   - **Owner E-Mail** (erforderlich)
   - **WAHA API URL** (optional)
   - **WAHA API Key** (optional)
   - **Subscription Plan** (Standard: Starter)
4. Klicke "Organisation erstellen"

**Automatische Einladung:**
- Wenn der Owner-Benutzer nicht existiert, wird automatisch eine Einladung erstellt
- Einladungs-Token ist 7 Tage gültig
- Owner erhält E-Mail mit Registrierungs-Link

### Super Admin Rechte vergeben

```sql
-- Super Admin hinzufügen
INSERT INTO super_admins (user_id, notes)
SELECT id, 'Admin access granted'
FROM auth.users
WHERE email = 'neue@email.com';

-- Super Admin entfernen
DELETE FROM super_admins
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'email@example.com');
```

---

## 🔒 Sicherheit

### Row Level Security (RLS)

Alle Tabellen sind mit RLS-Policies geschützt:

```sql
-- Beispiel: Benutzer sehen nur Daten ihrer Organisation
CREATE POLICY "Users see only org data" ON whatsapp_messages
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

### Authentifizierung

- **Supabase Auth** - E-Mail/Passwort
- **JWT Tokens** - Sichere Session-Verwaltung
- **Password Requirements** - Mindestlänge und Komplexität

### Empfohlene Sicherheitseinstellungen

In Supabase Dashboard → Authentication → Settings:

- ✅ **Email Confirmation** aktiviert
- ✅ **Leaked Password Protection** aktiviert
- ✅ **Multi-Factor Authentication** konfiguriert
- ✅ **JWT Expiry** auf angemessenen Wert gesetzt

### Audit Logging

Alle Super Admin Aktionen werden protokolliert:

```sql
SELECT
  sal.*,
  u.email as admin_email,
  sal.action,
  sal.target_type
FROM super_admin_logs sal
JOIN auth.users u ON sal.admin_user_id = u.id
ORDER BY sal.created_at DESC;
```

---

## 📡 API-Dokumentation

### WhatsApp API Endpunkte

#### QR-Code abrufen
```bash
GET /api/whatsapp/qr-code?session=default
```

#### Nachricht senden
```bash
POST /api/whatsapp/send-message
Content-Type: application/json

{
  "phoneNumber": "+49123456789",
  "message": "Hallo von WAHA!",
  "sessionName": "default"
}
```

#### Chats abrufen
```bash
GET /api/whatsapp/chats/overview
```

#### Nachrichten abrufen
```bash
GET /api/whatsapp/chats/[chatId]/messages?limit=100
```

### Super Admin API Endpunkte

#### Organisation erstellen
```bash
POST /api/super-admin/organizations
Content-Type: application/json

{
  "name": "Neue Firma",
  "owner_email": "owner@firma.com",
  "subscription_plan": "professional",
  "waha_api_url": "https://firma.up.railway.app",
  "waha_api_key": "secret_key"
}
```

#### Benutzer-Liste
```bash
GET /api/super-admin/users
```

### Team API Endpunkte

#### Einladung erstellen
```bash
POST /api/team/invite
Content-Type: application/json

{
  "email": "neues@mitglied.com",
  "role": "member"
}
```

#### Mitglieder-Liste
```bash
GET /api/team/members
```

---

## 🚀 Deployment

### Vercel Deployment (Empfohlen)

#### 1. Vercel CLI installieren
```bash
npm i -g vercel
```

#### 2. Projekt verlinken
```bash
vercel link
```

#### 3. Environment Variables setzen

In Vercel Dashboard → Settings → Environment Variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Stripe (Live Keys!)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Next.js
NEXTAUTH_SECRET=production_secret_here
NEXT_PUBLIC_APP_URL=https://ihre-domain.com
NODE_ENV=production
```

#### 4. Deployen
```bash
vercel --prod
```

### Stripe Production Setup

1. **Live Mode aktivieren** in Stripe Dashboard
2. **Produkte & Preise erstellen:**
   - Starter Plan (Monatlich/Jährlich)
   - Professional Plan (Monatlich/Jährlich)
   - Business Plan (Monatlich/Jährlich)
   - Enterprise Plan (Monatlich/Jährlich)

3. **Webhook Endpoint einrichten:**
   - URL: `https://ihre-domain.com/api/billing/webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. **API Keys kopieren** und in Environment Variables eintragen

### WAHA Deployment für Kunden

Pro Kunde eine eigene WAHA-Instanz deployen:

```bash
# Railway
railway up --image devlikeapro/waha:latest --name waha-kunde-a
railway variables set WHATSAPP_API_KEY=secret_123

# Oder: Render
# render.yaml mit WAHA Image konfigurieren

# Oder: Fly.io
fly launch --image devlikeapro/waha:latest --name waha-kunde-a
```

URL in Datenbank eintragen:

```sql
UPDATE organizations
SET waha_api_url = 'https://waha-kunde-a.up.railway.app',
    waha_api_key = 'secret_123'
WHERE slug = 'kunde-a';
```

---

## 🔧 Troubleshooting

### Problem: "WAHA API URL not configured"

**Lösung:**
```sql
-- WAHA URL für Organisation setzen
UPDATE organizations
SET waha_api_url = 'https://kunde.up.railway.app',
    waha_api_key = 'secret_key'
WHERE id = 'organization-uuid';
```

### Problem: Super Admin Zugriff verweigert

**Lösung:**
```sql
-- Prüfen ob Benutzer Super Admin ist
SELECT * FROM super_admins
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');

-- Falls nicht vorhanden, hinzufügen
INSERT INTO super_admins (user_id, is_active)
SELECT id, true FROM auth.users WHERE email = 'admin@example.com';
```

### Problem: Build-Fehler bei TypeScript

**Lösung:**
```bash
# TypeScript Fehler ignorieren (nur für Entwicklung!)
npm run build -- --no-lint

# Oder: Fehler beheben
npx tsc --noEmit
```

### Problem: Supabase RLS blockiert Zugriff

**Diagnose:**
```sql
-- RLS Policies für Tabelle prüfen
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- RLS temporär deaktivieren (NUR FÜR DEBUGGING!)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
```

### Problem: WAHA Container nicht erreichbar

**Diagnose:**
```bash
# Health Check
curl https://kunde.up.railway.app/api/server/health

# Mit API Key
curl https://kunde.up.railway.app/api/sessions \
  -H "Authorization: Bearer api_key"

# Logs prüfen
railway logs  # oder
docker logs waha-kunde-a
```

### Problem: Stripe Webhook schlägt fehl

**Lösung:**
1. Webhook Secret in Environment Variables prüfen
2. Webhook Endpoint URL korrekt: `https://domain.com/api/billing/webhook`
3. Events korrekt konfiguriert in Stripe Dashboard
4. Stripe CLI für lokales Testing:
   ```bash
   stripe listen --forward-to localhost:3001/api/billing/webhook
   ```

---

## 📊 Datenbank-Schema

### Haupttabellen

#### organizations
```sql
id                UUID PRIMARY KEY
name              TEXT NOT NULL
slug              TEXT UNIQUE NOT NULL
subscription_plan TEXT DEFAULT 'starter'
subscription_status TEXT DEFAULT 'trialing'
waha_api_url      TEXT
waha_api_key      TEXT
trial_ends_at     TIMESTAMP
created_at        TIMESTAMP
```

#### organization_members
```sql
id              UUID PRIMARY KEY
organization_id UUID REFERENCES organizations
user_id         UUID REFERENCES auth.users
role            TEXT (owner, admin, member)
is_active       BOOLEAN DEFAULT true
permissions     JSONB
joined_at       TIMESTAMP
```

#### organization_invitations
```sql
id              UUID PRIMARY KEY
organization_id UUID REFERENCES organizations
email           TEXT NOT NULL
role            TEXT DEFAULT 'member'
token           TEXT UNIQUE NOT NULL
expires_at      TIMESTAMP
created_by      UUID REFERENCES auth.users
```

#### super_admins
```sql
id         UUID PRIMARY KEY
user_id    UUID UNIQUE REFERENCES auth.users
is_active  BOOLEAN DEFAULT true
granted_at TIMESTAMP DEFAULT NOW()
notes      TEXT
```

---

## 🎯 Best Practices

### Multi-Tenant Isolation

- ✅ Immer `organization_id` in WHERE-Clauses verwenden
- ✅ RLS Policies für alle Tabellen aktiviert
- ✅ Server-side Supabase Client für API Routes
- ✅ User's Organization aus `organization_members` holen

### Performance

- ✅ Database Indexes auf häufig abgefragten Spalten
- ✅ Pagination für große Datensätze implementieren
- ✅ Caching für statische Daten nutzen
- ✅ Lazy Loading für Komponenten

### Sicherheit

- ✅ Niemals Service Role Key im Frontend verwenden
- ✅ Alle User-Inputs validieren und sanitizen
- ✅ Rate Limiting für API Endpunkte
- ✅ Regelmäßige Security Audits durchführen

---

## 📈 Cost Estimation

### Pro Kunde (bei 100 Kunden):

**WAHA Hosting:**
- Railway: ~$5-10/Monat → $500-1000/Monat
- Render: ~$7/Monat → $700/Monat
- Fly.io: ~$3-5/Monat → $300-500/Monat

**Infrastruktur:**
- Vercel: $20/Monat (Pro Plan)
- Supabase: $25/Monat (Pro Plan)
- Stripe: 2.9% + $0.30 pro Transaktion

**Total (100 Kunden):**
- Minimum: ~$345/Monat
- Maximum: ~$1045/Monat

---

## 🆘 Support

### Bei Problemen

1. **Logs prüfen:**
   - Browser Console (F12)
   - Vercel Logs (Vercel Dashboard)
   - Supabase Logs (Supabase Dashboard)
   - WAHA Logs (`docker logs waha` oder `railway logs`)

2. **Dokumentation durchsuchen:**
   - Diese README
   - Supabase Docs: https://supabase.com/docs
   - WAHA Docs: https://waha.devlike.pro/docs
   - Next.js Docs: https://nextjs.org/docs

3. **Community:**
   - GitHub Issues erstellen
   - Discord Server beitreten (falls vorhanden)

---

## 📄 Lizenz

MIT License - siehe LICENSE-Datei für Details.

---

## 🎉 Zusammenfassung

**Das Dashboard ist vollständig einsatzbereit mit:**

✅ Multi-Tenant Architektur
✅ WhatsApp Integration (WAHA)
✅ Super Admin Panel
✅ Stripe Billing (vorbereitet)
✅ Row Level Security
✅ Audit Logging
✅ Team Management
✅ Responsive Design
✅ Production Ready

**Nächste Schritte:**

1. ✅ Lokale Entwicklung starten
2. ✅ Ersten Super Admin erstellen
3. ✅ Organisation erstellen
4. ✅ WAHA konfigurieren
5. ✅ In Production deployen

**Viel Erfolg mit Ihrem WhatsApp Dashboard! 🚀**
