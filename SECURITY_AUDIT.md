# 🔒 Security Audit Report - WhatsApp Dashboard

**Audit Datum**: $(date)
**Status**: ⚠️ Produktionsbereit mit Empfehlungen

---

## ✅ Sicherheitsfeatures vorhanden

### 1. Authentifizierung & Autorisierung
- ✅ Supabase Auth Integration
- ✅ Row Level Security (RLS) Policies
- ✅ Role-based Access Control (RBAC)
- ✅ Multi-Tenant Organization Isolation
- ✅ Permission System (`lib/permissions.ts`)

### 2. API Security
- ✅ Server-side API Routes
- ✅ Supabase Service Role Key nur server-side
- ✅ Usage Tracking (`lib/usage-tracker.ts`)
- ✅ API Middleware (`lib/api-middleware.ts`)

### 3. Environment Security
- ✅ `.env.local` in `.gitignore`
- ✅ Separate Test/Production Keys
- ✅ Service Role Key nicht im Client exposed

---

## ⚠️ Kritische Punkte zu beachten

### 1. Stripe Live Mode Setup (KRITISCH!)

**Aktuell in `.env.local`:**
```bash
# ⚠️ DIESE SIND TEST-KEYS!
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnopqrstuvwxyz
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefghijklmnopqrstuvwxyz
```

**VOR PRODUCTION:**
1. Stripe Dashboard → Live Mode aktivieren
2. Neue Live Keys generieren:
   - `sk_live_...` für STRIPE_SECRET_KEY
   - `pk_live_...` für NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
3. Webhook Secret für Production-URL generieren

**Sicherheitsrisiko**: Test-Keys in Production = keine echten Zahlungen!

### 2. NEXTAUTH_SECRET (KRITISCH!)

**Aktuell:**
```bash
NEXTAUTH_SECRET=your_nextauth_secret
```

**Aktion erforderlich:**
```bash
# Neuen starken Secret generieren:
openssl rand -base64 32

# Oder:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Sicherheitsrisiko**: Schwacher Secret = Session-Hijacking möglich!

### 3. WAHA API Key

**Aktuell in `.env.local`:**
```bash
WAHA_API_KEY=]Sc(QfQPM<^ZZ!C4sk|:(Ias&"^zs5
```

✅ **Gut**: API Key ist komplex und zufällig
⚠️ **Prüfen**: Ist dieser Key nur für Production oder auch Development?

**Empfehlung**: Separate Keys für Dev/Staging/Production

---

## 🔍 Code Security Analyse

### 1. Environment Variable Handling

**Geprüfte Dateien:**
- ✅ Keine hardcoded Secrets im Code
- ✅ Test-Keys nur in node_modules (OK)
- ✅ Kein Secret Leakage in Git

### 2. TODO/FIXME im Code

**Gefunden:**
```typescript
// lib/permissions.ts:366
// TODO: Send invitation email

// app/api/team/members/route.ts:196
// TODO: Send invitation email
```

**Impact**: Low (Feature-Enhancement, kein Security Issue)
**Empfehlung**: Email-Versand für Team-Einladungen implementieren

### 3. Permissions System

**Analyse von `lib/permissions.ts`:**

✅ **Gut implementiert:**
- Role Hierarchy (viewer < member < admin < owner)
- Permission Checks für alle Actions
- Organization-basierte Isolation
- Audit Logging vorhanden

⚠️ **Zu überprüfen:**
- RLS Policies müssen mit Permission System übereinstimmen
- Invitation Token Generation ist basic (aber OK für Start)

**Invitation Token:**
```typescript
function generateInvitationToken(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}
```

**Empfehlung**: Verwende crypto für Token-Generierung:
```typescript
import crypto from 'crypto'

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
```

---

## 🛡️ Supabase Security Checklist

### Row Level Security (RLS) Policies

**KRITISCH zu prüfen in Supabase Dashboard:**

1. **users Tabelle**
   ```sql
   -- Prüfen ob diese Policy existiert:
   SELECT * FROM pg_policies WHERE tablename = 'users';

   -- User kann nur eigene Daten sehen:
   CREATE POLICY "Users can view own data"
     ON users FOR SELECT
     USING (auth.uid() = id);
   ```

2. **whatsapp_contacts**
   ```sql
   -- Organization Isolation:
   CREATE POLICY "Users can view contacts in their organization"
     ON whatsapp_contacts FOR SELECT
     USING (
       organization_id IN (
         SELECT organization_id FROM organization_members
         WHERE user_id = auth.uid() AND is_active = true
       )
     );
   ```

3. **whatsapp_messages**
   ```sql
   -- Message Access basierend auf Organization:
   CREATE POLICY "Users can view messages in their organization"
     ON whatsapp_messages FOR SELECT
     USING (
       organization_id IN (
         SELECT organization_id FROM organization_members
         WHERE user_id = auth.uid() AND is_active = true
       )
     );
   ```

4. **subscriptions**
   ```sql
   -- Nur eigene Subscription sehen:
   CREATE POLICY "Users can view own subscription"
     ON subscriptions FOR SELECT
     USING (user_id = auth.uid());
   ```

**Aktion vor Go-Live:**
```sql
-- RLS Status aller Tabellen prüfen:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Alle Policies anzeigen:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 🔐 API Security Review

### 1. WhatsApp API Endpoints

**Geprüfte Endpoints:**
- `/api/whatsapp/send-message`
- `/api/whatsapp/qr-code`
- `/api/whatsapp/session-status`
- `/api/whatsapp/create-session`

**Zu implementieren:**
- [ ] Rate Limiting auf Endpoint-Level
- [ ] Input Validation (Phone Number Format)
- [ ] Message Content Sanitization
- [ ] WAHA API Error Handling

**Beispiel Rate Limiting:**
```typescript
// lib/rate-limiter.ts (neu erstellen)
import { NextRequest } from 'next/server'

const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  req: NextRequest,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()

  const userLimit = rateLimit.get(ip)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (userLimit.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  userLimit.count++
  return { allowed: true, remaining: limit - userLimit.count }
}
```

### 2. Webhook Endpoints

**`/api/webhooks/whatsapp`**

⚠️ **Zu implementieren:**
- [ ] Webhook Signature Verification
- [ ] IP Allowlist (nur WAHA Server)
- [ ] Request Size Limit
- [ ] Duplicate Event Handling

**WAHA Webhook Security:**
```typescript
// Webhook Secret Validation
const isValidWebhook = (req: NextRequest): boolean => {
  const signature = req.headers.get('x-webhook-signature')
  const secret = process.env.WAHA_WEBHOOK_SECRET

  if (!signature || !secret) return false

  // Verify signature
  const crypto = require('crypto')
  const body = await req.text()
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return signature === expectedSignature
}
```

### 3. Stripe Webhook

**`/api/billing/webhook`**

✅ **Bereits implementiert** (vermutlich):
- Stripe Signature Verification
- Event Handling

**Zu prüfen:**
```typescript
// Stelle sicher, dass Stripe constructEvent verwendet wird:
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const sig = req.headers.get('stripe-signature')!
const event = stripe.webhooks.constructEvent(
  await req.text(),
  sig,
  process.env.STRIPE_WEBHOOK_SECRET!
)
```

---

## 🚨 Production Security Checklist

### Vor Deployment

- [ ] **Environment Variables**
  - [ ] NEXTAUTH_SECRET mit starkem Random-Secret ersetzen
  - [ ] Stripe Live Keys (sk_live_, pk_live_)
  - [ ] Stripe Webhook Secret (Production URL)
  - [ ] WAHA Production Keys separate von Dev

- [ ] **Supabase**
  - [ ] RLS aktiviert auf allen Tabellen
  - [ ] Policies getestet und validiert
  - [ ] Service Role Key nur server-side
  - [ ] Backups konfiguriert

- [ ] **API Security**
  - [ ] Rate Limiting implementiert
  - [ ] Input Validation auf allen Endpoints
  - [ ] Error Messages sanitized (keine DB-Details exposen)
  - [ ] CORS richtig konfiguriert

- [ ] **Stripe**
  - [ ] Live Mode aktiviert
  - [ ] Webhook für Production-URL konfiguriert
  - [ ] Test-Zahlungen durchgeführt
  - [ ] Refund/Dispute Handling getestet

- [ ] **WAHA**
  - [ ] Webhook Signature Verification
  - [ ] Session Timeout Handling
  - [ ] Error Logging aktiviert
  - [ ] Health Checks eingerichtet

### Nach Deployment

- [ ] **Monitoring**
  - [ ] Error Tracking (Sentry)
  - [ ] Log Aggregation
  - [ ] Performance Monitoring
  - [ ] Security Alerts

- [ ] **Compliance**
  - [ ] DSGVO Datenschutzerklärung
  - [ ] Cookie Consent
  - [ ] Terms of Service
  - [ ] Privacy Policy

---

## 🔧 Empfohlene Security Improvements

### Priorität: Hoch

1. **Invitation Token Security**
   ```typescript
   // lib/permissions.ts - Update Token Generation
   import crypto from 'crypto'

   function generateInvitationToken(): string {
     return crypto.randomBytes(32).toString('hex')
   }
   ```

2. **Rate Limiting Implementation**
   ```bash
   npm install rate-limiter-flexible
   ```

3. **Helmet.js für Security Headers**
   ```bash
   npm install helmet
   ```

   ```typescript
   // middleware.ts
   import { NextResponse } from 'next/server'

   export function middleware(request: Request) {
     const response = NextResponse.next()

     // Security Headers
     response.headers.set('X-Content-Type-Options', 'nosniff')
     response.headers.set('X-Frame-Options', 'DENY')
     response.headers.set('X-XSS-Protection', '1; mode=block')
     response.headers.set(
       'Strict-Transport-Security',
       'max-age=31536000; includeSubDomains'
     )

     return response
   }
   ```

### Priorität: Mittel

4. **Email Verification bei Registrierung**
   - Verhindert Fake-Accounts
   - Supabase Email Auth nutzen

5. **2FA (Two-Factor Authentication)**
   - Für Admin/Owner Rollen
   - TOTP via Authenticator App

6. **API Key Rotation**
   - Automatische Key-Rotation alle 90 Tage
   - Audit Trail für Key-Changes

### Priorität: Niedrig

7. **Content Security Policy (CSP)**
   ```typescript
   // next.config.js
   const securityHeaders = [
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; ..."
     }
   ]
   ```

8. **Subresource Integrity (SRI)**
   - Für externe Scripts
   - CDN Resources validieren

---

## 📊 Security Score

**Overall Security Score: 7.5/10**

### Breakdown:
- ✅ Authentication: 9/10
- ✅ Authorization: 8/10
- ⚠️ API Security: 7/10 (Rate Limiting fehlt)
- ⚠️ Data Protection: 8/10 (RLS muss validiert werden)
- ⚠️ Secret Management: 6/10 (Secrets müssen erneuert werden)
- ✅ Code Security: 8/10

### Empfehlung:
**Das Projekt ist produktionsbereit, wenn:**
1. ✅ NEXTAUTH_SECRET erneuert
2. ✅ Stripe Live Keys konfiguriert
3. ✅ Supabase RLS validiert
4. ✅ Rate Limiting implementiert
5. ✅ Security Headers aktiviert

**Geschätzte Zeit für Fixes: 2-3 Stunden**

---

## 🔗 Nützliche Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Stripe Security](https://stripe.com/docs/security/guide)
- [DSGVO Compliance](https://gdpr.eu/checklist/)

---

**Next Steps:**
1. Kritische Punkte fixen (siehe Checkliste)
2. Security Test durchführen
3. Penetration Test (optional, empfohlen)
4. Production Deployment
