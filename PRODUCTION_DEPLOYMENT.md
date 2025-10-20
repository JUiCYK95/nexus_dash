# 🚀 WhatsApp Dashboard - Production Deployment Guide

**Status**: Build erfolgreich ✅
**Letzter Build**: $(date)

---

## 📋 Production Checkliste

### ✅ Abgeschlossen
- [x] Build-Fehler behoben (Suspense Boundaries)
- [x] Production Build erfolgreich getestet
- [x] Next.js 15 optimiert
- [x] TypeScript konfiguriert
- [x] Supabase Integration vorhanden

### 🔧 Vor Deployment - WICHTIG!

#### 1. Environment Variables konfigurieren

**Aktuelle Test-Keys MÜSSEN ersetzt werden:**

```bash
# ⚠️ PRODUKTIONS-ENVIRONMENT (.env.production oder Vercel/Railway)

# === SUPABASE (bereits konfiguriert) ===
NEXT_PUBLIC_SUPABASE_URL=https://ijbrtnxhtojmnfavhrpx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# === STRIPE - LIVE KEYS VERWENDEN! ===
STRIPE_SECRET_KEY=sk_live_... # ⚠️ NICHT sk_test_!
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # ⚠️ NICHT pk_test_!
STRIPE_WEBHOOK_SECRET=whsec_... # Von Stripe Webhook Endpoint

# === STRIPE PRICE IDs (in Stripe Dashboard erstellen) ===
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...

# === WAHA (bereits konfiguriert) ===
WAHA_API_URL=https://botzimmerwa-production.up.railway.app
WAHA_API_KEY=]Sc(QfQPM<^ZZ!C4sk|:(Ias&"^zs5

# === NEXT.JS ===
NEXTAUTH_SECRET=[NEUEN STARKEN SECRET GENERIEREN!]
NEXT_PUBLIC_APP_URL=https://ihre-domain.com
NODE_ENV=production

# === OPTIONAL: Feature Flags ===
NEXT_PUBLIC_ENABLE_BILLING=true
NEXT_PUBLIC_ENABLE_TEAM_FEATURES=true
NEXT_PUBLIC_ENABLE_API_ACCESS=true
NEXT_PUBLIC_ENABLE_WEBHOOKS=true
```

#### 2. Stripe Production Setup

**Schritte in Stripe Dashboard:**

1. **Wechsel zu Live Mode** (Toggle oben rechts)

2. **Produkte & Preise erstellen:**
   - Gehe zu: Products → Create Product
   - Für jeden Plan (Starter, Pro, Business, Enterprise):
     - Monatlicher Preis
     - Jährlicher Preis (mit Rabatt)
   - Kopiere die `price_xxx` IDs

3. **Webhook Endpoint einrichten:**
   - Gehe zu: Developers → Webhooks
   - URL: `https://ihre-domain.com/api/billing/webhook`
   - Events auswählen:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Kopiere den Webhook Secret

4. **API Keys kopieren:**
   - Gehe zu: Developers → API Keys
   - Secret Key (sk_live_...) → Environment Variable
   - Publishable Key (pk_live_...) → Environment Variable

#### 3. Supabase Production Setup

**Aktuelle Konfiguration:**
- ✅ Supabase Projekt bereits erstellt
- ✅ URLs und Keys konfiguriert
- ⚠️ **Wichtig**: Row Level Security (RLS) prüfen!

**RLS Policies validieren:**
```sql
-- In Supabase SQL Editor ausführen:

-- Prüfe RLS Status für alle Tabellen
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- RLS MUSS für alle User-Tabellen aktiviert sein!
```

**Benötigte Policies** (siehe `supabase-schema.sql`):
- `users` → User kann nur eigene Daten sehen/ändern
- `whatsapp_contacts` → Filtern nach organization_id
- `whatsapp_messages` → Filtern nach organization_id
- `whatsapp_sessions` → Filtern nach organization_id
- `subscriptions` → Filtern nach user_id

#### 4. WAHA Production Setup

**Aktuell:**
- ✅ WAHA läuft auf Railway: `https://botzimmerwa-production.up.railway.app`
- ✅ API Key konfiguriert

**Zu prüfen:**
- [ ] WAHA Container läuft stabil
- [ ] Health Check: `GET /health`
- [ ] Session Management funktioniert
- [ ] Webhook URL konfiguriert: `https://ihre-domain.com/api/webhooks/whatsapp`

**WAHA Webhook konfigurieren:**
```bash
# Via WAHA API:
POST https://botzimmerwa-production.up.railway.app/api/sessions/default/settings
{
  "webhookUrl": "https://ihre-domain.com/api/webhooks/whatsapp",
  "webhookEvents": ["message", "message.any"]
}
```

#### 5. Security Checklist

- [ ] **NEXTAUTH_SECRET** → Neuen starken Secret generieren:
  ```bash
  openssl rand -base64 32
  ```

- [ ] **Environment Variables** → Niemals in Git committen
  - `.env.local` ist in `.gitignore`
  - Nur über Deployment-Platform (Vercel/Railway) setzen

- [ ] **API Rate Limiting** → Usage Tracker konfiguriert prüfen
  - Siehe: `lib/usage-tracker.ts`

- [ ] **CORS** → Nur eigene Domain erlauben
  - In `next.config.js` prüfen

- [ ] **Supabase RLS** → Alle Policies aktiv

#### 6. Database Migrations

**Supabase Migrations ausführen:**

```bash
# Prüfe Supabase Status
cd supabase
ls -la migrations/

# Migrations sind bereits vorhanden in /supabase/migrations/
# Diese sollten bereits auf Supabase ausgeführt sein

# Falls nicht, in Supabase Dashboard:
# SQL Editor → Neue Query → Inhalt von supabase-schema.sql einfügen
```

---

## 🚀 Deployment Optionen

### Option 1: Vercel (Empfohlen für Next.js)

**Vorteile:**
- ✅ Automatische Next.js Optimierung
- ✅ Edge Functions
- ✅ Kostenloses Hobby Tier
- ✅ Einfaches GitHub Integration

**Schritte:**

1. **Vercel Account erstellen**: https://vercel.com

2. **Projekt deployen:**
   ```bash
   npm i -g vercel
   vercel
   ```

3. **Environment Variables setzen:**
   - Vercel Dashboard → Settings → Environment Variables
   - Alle Variablen aus `.env.production` hinzufügen
   - **Production**, **Preview**, **Development** auswählen

4. **Custom Domain verbinden:**
   - Settings → Domains → Add Domain
   - DNS konfigurieren (A Record oder CNAME)

5. **Build Settings:**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Option 2: Railway

**Vorteile:**
- ✅ Einfaches Docker Deployment
- ✅ Integrierte Datenbanken
- ✅ WAHA bereits auf Railway

**Schritte:**

1. **Railway Account**: https://railway.app

2. **Neues Projekt erstellen:**
   - Connect GitHub Repo
   - Oder: Deploy from Template

3. **Environment Variables:**
   - Settings → Variables → Bulk Import
   - Alle Variablen einfügen

4. **Deployment Settings:**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Port: 3000 (automatisch)

5. **Domain:**
   - Settings → Networking → Custom Domain

### Option 3: Docker (Selbst-Hosting)

**Dockerfile erstellen:**

```dockerfile
# Datei: Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

**Docker Compose:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
```

**Deployment:**
```bash
docker build -t whatsapp-dashboard .
docker run -p 3000:3000 --env-file .env.production whatsapp-dashboard
```

---

## 🔍 Post-Deployment Checks

### 1. Funktionalität testen

- [ ] **Authentication**
  - Registrierung funktioniert
  - Login funktioniert
  - Logout funktioniert

- [ ] **WhatsApp Integration**
  - QR-Code wird angezeigt
  - Session kann erstellt werden
  - Nachrichten können gesendet werden
  - Webhook empfängt Events

- [ ] **Stripe Billing**
  - Checkout funktioniert
  - Webhooks kommen an
  - Subscriptions werden erstellt
  - Customer Portal funktioniert

- [ ] **Dashboard**
  - Analytics werden geladen
  - Chat-Interface funktioniert
  - Kontakte werden angezeigt

### 2. Performance Monitoring

**Vercel Analytics** (wenn auf Vercel):
- Automatisch aktiviert
- Dashboard → Analytics

**Lighthouse Score prüfen:**
```bash
npm i -g lighthouse
lighthouse https://ihre-domain.com --view
```

**Ziele:**
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90

### 3. Error Monitoring Setup

**Empfohlen: Sentry Integration**

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**Sentry konfigurieren:**
- Projekt erstellen auf https://sentry.io
- DSN in Environment Variables

### 4. Backup Strategy

**Supabase Backups:**
- Automatisch täglich (in Supabase)
- Settings → Backups
- Manueller Backup vor großen Changes

**Environment Variables:**
- Sichere Kopie außerhalb von Git
- 1Password / LastPass / Vault

---

## 📊 Monitoring & Maintenance

### Logs überwachen

**Vercel:**
```bash
vercel logs [deployment-url]
```

**Railway:**
- Dashboard → Deployments → Logs

**Docker:**
```bash
docker logs -f [container-id]
```

### Wichtige Metriken

1. **API Response Times**
   - WhatsApp API < 500ms
   - Supabase Queries < 200ms

2. **Error Rates**
   - < 1% Error Rate
   - Keine 500er Errors

3. **WhatsApp Session Status**
   - Health Check jede Stunde
   - Alert bei Session Disconnect

### Regelmäßige Updates

```bash
# Dependencies aktualisieren (monatlich)
npm outdated
npm update

# Security Audit
npm audit
npm audit fix

# Next.js Updates
npm install next@latest react@latest react-dom@latest
```

---

## 🆘 Troubleshooting

### Build schlägt fehl
```bash
# Cache löschen
rm -rf .next node_modules
npm install
npm run build
```

### Stripe Webhooks kommen nicht an
1. Prüfe Webhook URL in Stripe Dashboard
2. Checke Logs: `/api/billing/webhook`
3. Teste mit Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

### WAHA Session disconnected
1. Health Check: `GET /api/sessions/default/status`
2. Neue Session erstellen: `/dashboard/settings`
3. Container neu starten (Railway)

### Supabase RLS Errors
```sql
-- RLS temporär deaktivieren (nur für Debug!)
ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;

-- Policies prüfen
SELECT * FROM pg_policies WHERE tablename = 'whatsapp_messages';
```

---

## 🎯 Quick Start für ersten Kunden

### Minimale Setup-Zeit: ~30 Minuten

1. **Vercel Deployment** (10 min)
   - GitHub Repo connecten
   - Environment Variables setzen
   - Auto-Deploy

2. **Stripe Live Mode** (10 min)
   - Produkte erstellen
   - Webhook konfigurieren
   - Keys kopieren

3. **Domain verbinden** (5 min)
   - Custom Domain in Vercel
   - DNS konfigurieren

4. **WhatsApp Setup** (5 min)
   - QR-Code scannen
   - Session aktivieren
   - Test-Nachricht senden

5. **Final Checks** (5 min)
   - Login testen
   - Checkout testen
   - WhatsApp testen

---

## ✅ Production Ready Checklist

**Vor Go-Live:**

- [ ] Alle Environment Variables gesetzt (LIVE Keys!)
- [ ] Stripe Live Mode konfiguriert
- [ ] Supabase RLS aktiviert
- [ ] WAHA Webhook konfiguriert
- [ ] Custom Domain verbunden
- [ ] SSL/HTTPS aktiv
- [ ] Error Monitoring (Sentry)
- [ ] Backups konfiguriert
- [ ] Performance getestet (Lighthouse)
- [ ] Security Audit durchgeführt
- [ ] Erste Registrierung getestet
- [ ] Erste WhatsApp-Session getestet
- [ ] Erste Stripe-Zahlung getestet

**Nach Go-Live:**

- [ ] Monitoring aktiv
- [ ] Support-Email konfiguriert
- [ ] Dokumentation für Kunden
- [ ] Onboarding-Flow getestet
- [ ] Billing-Zyklus überwachen

---

## 📞 Support & Hilfe

**Bei Problemen:**
1. Logs checken (Vercel/Railway Dashboard)
2. Troubleshooting-Docs prüfen
3. Supabase Dashboard → Logs
4. Stripe Dashboard → Events/Logs

**Hilfreiche Commands:**
```bash
# Build lokal testen
npm run build && npm start

# Production Preview
vercel --prod

# Logs in Echtzeit
vercel logs --follow
```

---

**Viel Erfolg mit dem ersten Kunden! 🚀**
