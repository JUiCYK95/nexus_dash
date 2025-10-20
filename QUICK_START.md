# 🚀 Quick Start - Erster Kunde in 30 Minuten

**Ziel**: WhatsApp Dashboard für den ersten Kunden live nehmen

---

## ⚡ Express-Setup (30 Minuten)

### Schritt 1: Pre-Flight Check (5 Min)

```bash
# Setup-Skript ausführen
chmod +x scripts/production-setup.sh
./scripts/production-setup.sh
```

Das Skript prüft:
- ✅ Node.js Version
- ✅ Environment Variables
- ✅ Production Build
- ✅ Security Issues
- ✅ Dependencies

**Falls Fehler auftreten**: Folge den Anweisungen im Output

### Schritt 2: Stripe Live Mode (10 Min)

1. **Stripe Dashboard öffnen**: https://dashboard.stripe.com
2. **Live Mode aktivieren** (Toggle oben rechts)
3. **Produkte erstellen**:
   ```
   Products → Create Product

   - Starter Plan: €29/Monat (oder deine Preise)
   - Pro Plan: €79/Monat
   - Business Plan: €199/Monat
   ```
4. **Price IDs kopieren** und in `.env.local` oder Deployment-Platform eintragen

5. **Webhook konfigurieren**:
   ```
   Developers → Webhooks → Add Endpoint
   URL: https://deine-domain.com/api/billing/webhook

   Events:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   ```

6. **Keys kopieren**:
   ```bash
   # In .env.local oder Vercel/Railway:
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Schritt 3: Deployment (10 Min)

#### Option A: Vercel (Empfohlen)

```bash
# Vercel CLI installieren
npm i -g vercel

# Einmalig: Projekt verbinden
vercel

# Production Deployment
vercel --prod
```

**Environment Variables in Vercel setzen**:
1. Vercel Dashboard → Settings → Environment Variables
2. Alle Vars aus `.env.local` hinzufügen
3. "Production" auswählen
4. Redeploy triggern

#### Option B: Railway

```bash
# Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Schritt 4: Domain & SSL (3 Min)

**Vercel:**
- Settings → Domains → Add Domain
- DNS konfigurieren (A Record auf Vercel IP)
- SSL automatisch via Let's Encrypt

**Railway:**
- Settings → Networking → Custom Domain
- DNS konfigurieren

### Schritt 5: Final Checks (2 Min)

Test-Checklist:
```bash
# 1. Deployment URL öffnen
https://deine-domain.com

# 2. Registrierung testen
- Neuen User erstellen
- Email bestätigen (falls aktiviert)
- Login erfolgreich

# 3. WhatsApp Setup
- Dashboard → Settings
- QR-Code anzeigen
- Mit WhatsApp scannen
- Session aktiv

# 4. Stripe Checkout
- Dashboard → Billing
- Plan auswählen
- Test-Zahlung (mit Test-Karte)
- Subscription aktiv

# 5. Erste Nachricht
- Dashboard → Chat
- Kontakt auswählen
- Nachricht senden
- Antwort empfangen (Webhook)
```

---

## 🔧 Troubleshooting

### Build schlägt fehl
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Environment Variables fehlen
```bash
# Prüfe .env.local
cat .env.local | grep -E "STRIPE|SUPABASE|NEXTAUTH"

# Neu generieren falls nötig:
openssl rand -base64 32  # Für NEXTAUTH_SECRET
```

### Stripe Webhook funktioniert nicht
1. Stripe Dashboard → Webhooks → Logs prüfen
2. URL muss HTTPS sein
3. Events müssen ausgewählt sein

### WAHA Session disconnected
```bash
# Health Check
curl https://botzimmerwa-production.up.railway.app/health

# Neue Session erstellen
Dashboard → Settings → QR-Code neu scannen
```

---

## 📋 Post-Launch Checklist

Nach erfolgreichem Deployment:

- [ ] **Monitoring Setup**
  - [ ] Vercel Analytics aktivieren
  - [ ] Error Tracking (Sentry) optional
  - [ ] Uptime Monitoring (z.B. UptimeRobot)

- [ ] **Backup & Recovery**
  - [ ] Supabase Backups aktiv (automatisch)
  - [ ] Environment Variables extern gesichert
  - [ ] Deployment-Config dokumentiert

- [ ] **Kunden-Onboarding**
  - [ ] Welcome Email Template
  - [ ] Onboarding-Guide für Kunden
  - [ ] Support-Kanal definieren

- [ ] **Compliance**
  - [ ] Datenschutzerklärung (DSGVO)
  - [ ] Terms of Service
  - [ ] Cookie Consent (falls EU)

---

## 🎯 Nächste Schritte

### Tag 1-7: Monitoring
- Logs täglich prüfen
- Stripe Payments überwachen
- WhatsApp Sessions checken
- User Feedback sammeln

### Woche 2: Optimierung
- Performance-Metriken analysieren
- Error Rate reduzieren
- User Experience verbessern
- Features basierend auf Feedback

### Monat 1: Skalierung
- Weitere Kunden onboarden
- Auto-Scaling konfigurieren
- Rate Limits anpassen
- Premium Features entwickeln

---

## 💡 Wichtige Commands

```bash
# Build lokal testen
npm run build && npm start

# Logs ansehen (Vercel)
vercel logs --follow

# Logs ansehen (Railway)
railway logs

# Deployment Status
vercel inspect [url]

# Environment Variables anzeigen
vercel env ls

# Rollback (falls nötig)
vercel rollback
```

---

## 🆘 Support

**Bei Problemen:**

1. **Logs checken**:
   - Vercel/Railway Dashboard → Logs
   - Browser Console (F12)
   - Supabase Dashboard → Logs

2. **Dokumentation**:
   - `PRODUCTION_DEPLOYMENT.md` - Ausführliche Anleitung
   - `SECURITY_AUDIT.md` - Security-Checks
   - `.claude/PROJECT.md` - Projekt-Übersicht

3. **Commands**:
   - `./scripts/production-setup.sh` - Setup-Skript
   - `/debug` - Claude Code Debug Command

---

## ✅ Success Criteria

**Deployment ist erfolgreich wenn:**

✅ Website ist unter Custom Domain erreichbar
✅ HTTPS/SSL aktiv
✅ User kann sich registrieren & einloggen
✅ WhatsApp Session kann erstellt werden
✅ Nachrichten können gesendet werden
✅ Stripe Checkout funktioniert
✅ Webhooks kommen an
✅ Dashboard zeigt Daten an
✅ Keine kritischen Errors in Logs

**Dann: Erste Kunde kann starten! 🎉**

---

## 📊 Expected Performance

**Nach Deployment solltest du sehen:**

- Build Size: ~500KB (gzipped)
- First Load JS: ~320KB
- Lighthouse Score: >85
- API Response: <500ms
- TTI (Time to Interactive): <3s

**Monitoring Ziele:**
- Uptime: >99.9%
- Error Rate: <1%
- Response Time: <1s
- User Satisfaction: >4.5/5

---

**Viel Erfolg! 🚀**
