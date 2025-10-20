# 🔌 WAHA Integration - Setup & Troubleshooting

**Status**: Integration implementiert ✅ | WAHA Service Setup erforderlich ⚠️

---

## 🔍 Aktueller Status

### ✅ Was funktioniert
- WAHA Client vollständig implementiert (`lib/waha-client.ts`)
- Alle API Routes verwenden jetzt echten WAHA Client
- Fehlerbehandlung mit hilfreichen Error Messages
- Graceful Degradation (funktioniert auch ohne WAHA)

### ⚠️ Was noch eingerichtet werden muss
- **WAHA Service ist nicht erreichbar** unter `https://botzimmerwa-production.up.railway.app`
- Railway Deployment muss neu aufgesetzt oder URL aktualisiert werden
- Alternative: Lokales WAHA Docker Setup

---

## 🚀 WAHA Setup - Optionen

### Option 1: Railway (Production - Empfohlen)

**Das WAHA Deployment auf Railway scheint down zu sein.**

**Neu aufsetzen:**

1. **Railway Account**: https://railway.app

2. **WAHA Template deployen**:
   ```bash
   # Via Railway CLI
   railway login
   railway init

   # WAHA Docker Image deployen
   railway up --image devlikeapro/waha:latest
   ```

3. **Environment Variables in Railway**:
   ```bash
   WHATSAPP_API_KEY=[DEIN_SECRET_KEY]
   WHATSAPP_SWAGGER_ENABLED=true
   WHATSAPP_WEBHOOK_URL=https://deine-dashboard-domain.com/api/webhooks/whatsapp
   ```

4. **Public URL kopieren**:
   - Railway Dashboard → Service → Settings → Public Networking
   - URL kopieren (z.B. `https://your-service.up.railway.app`)

5. **In Dashboard .env.local eintragen**:
   ```bash
   WAHA_API_URL=https://your-service.up.railway.app
   WAHA_API_KEY=[DEIN_SECRET_KEY]
   ```

### Option 2: Docker Lokal (Development)

**Für lokale Entwicklung:**

```bash
# WAHA Container starten
docker run -d \
  --name waha \
  -p 3000:3000 \
  -e WHATSAPP_API_KEY=your_secret_key \
  -e WHATSAPP_SWAGGER_ENABLED=true \
  devlikeapro/waha:latest

# Health Check
curl http://localhost:3000/api/server/health

# In .env.local
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=your_secret_key
```

### Option 3: Render/Fly.io/andere Cloud

**Render.com:**
```yaml
# render.yaml
services:
  - type: web
    name: waha
    env: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    envVars:
      - key: WHATSAPP_API_KEY
        generateValue: true
      - key: WHATSAPP_SWAGGER_ENABLED
        value: true
```

**Fly.io:**
```bash
fly launch --image devlikeapro/waha:latest
fly secrets set WHATSAPP_API_KEY=your_secret_key
```

---

## 🔧 API Endpoints - Implementierte Integration

### 1. **QR Code abrufen** (`/api/whatsapp/qr-code`)

**Request:**
```bash
GET /api/whatsapp/qr-code?session=default
```

**Response (Success):**
```json
{
  "success": true,
  "qr": "2@xxxxxxxxxxx...",  // QR Code String
  "session": "default"
}
```

**Response (WAHA Unavailable):**
```json
{
  "success": false,
  "error": "WAHA service is not available. Please check WAHA_API_URL...",
  "details": "ECONNREFUSED"
}
```

**WAHA Call:**
```typescript
GET ${WAHA_API_URL}/api/sessions/${sessionName}/auth/qr
Authorization: Bearer ${WAHA_API_KEY}
```

### 2. **Session erstellen** (`/api/whatsapp/create-session`)

**Request:**
```bash
POST /api/whatsapp/create-session
{
  "sessionName": "default",
  "webhookUrl": "https://yourdomain.com/api/webhooks/whatsapp"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "name": "default",
    "status": "SCAN_QR_CODE",
    "webhookUrl": "https://yourdomain.com/api/webhooks/whatsapp"
  }
}
```

**WAHA Call:**
```typescript
POST ${WAHA_API_URL}/api/sessions
{
  "name": "default",
  "config": {
    "webhooks": [{
      "url": "https://yourdomain.com/api/webhooks/whatsapp",
      "events": ["message", "message.any"]
    }]
  }
}
```

### 3. **Nachricht senden** (`/api/whatsapp/send-message`)

**Request:**
```bash
POST /api/whatsapp/send-message
Authorization: Bearer <user-token>
{
  "contactId": "123",
  "message": "Hallo!",
  "sessionName": "default",
  "phoneNumber": "+491234567890"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_1234567890",
    "status": "sent",
    "message": {...},
    "usage": {...}
  }
}
```

**Response (WAHA Failed, but saved):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg_1234567890",
    "status": "failed",
    "message": {
      "error": "WAHA service unavailable"
    }
  }
}
```

**WAHA Call:**
```typescript
POST ${WAHA_API_URL}/api/sendText
{
  "session": "default",
  "chatId": "+491234567890",
  "text": "Hallo!"
}
```

### 4. **Session Status** (`/api/whatsapp/session-status`)

**Request:**
```bash
GET /api/whatsapp/session-status?session=default
```

**Response:**
```json
{
  "success": true,
  "status": "WORKING",  // SCAN_QR_CODE | WORKING | FAILED
  "name": "default"
}
```

**WAHA Call:**
```typescript
GET ${WAHA_API_URL}/api/sessions/${sessionName}
```

---

## 🛡️ Error Handling

Alle Endpoints haben intelligente Error Handling:

### WAHA nicht erreichbar (503):
```json
{
  "success": false,
  "error": "WAHA service is not available",
  "details": "ECONNREFUSED"
}
```

### WAHA Fehler (500):
```json
{
  "success": false,
  "error": "Failed to get QR code",
  "details": "Session not found"
}
```

### Graceful Degradation:
- **Send Message**: Speichert Nachricht als "failed" in DB, gibt aber 200 zurück
- **QR Code**: Gibt hilfreichen Error mit Setup-Anweisungen
- **Session Status**: Zeigt "disconnected" statt zu crashen

---

## 🔍 Troubleshooting

### Problem: "WAHA service is not available"

**Diagnose:**
```bash
# 1. Prüfe Environment Variable
echo $WAHA_API_URL

# 2. Teste WAHA direkt
curl https://your-waha-url.com/api/server/health

# 3. Teste mit API Key
curl https://your-waha-url.com/api/sessions \
  -H "Authorization: Bearer $WAHA_API_KEY"
```

**Lösungen:**
1. ✅ Railway/Render Deployment neu starten
2. ✅ WAHA_API_URL in .env.local prüfen
3. ✅ WAHA_API_KEY korrekt setzen
4. ✅ Firewall/Network prüfen

### Problem: "Session not found"

**Ursache**: Session wurde noch nicht erstellt

**Lösung:**
```bash
# 1. Session erstellen
POST /api/whatsapp/create-session
{
  "sessionName": "default"
}

# 2. QR Code abrufen
GET /api/whatsapp/qr-code?session=default

# 3. Mit WhatsApp scannen

# 4. Status prüfen
GET /api/whatsapp/session-status?session=default
```

### Problem: Nachrichten werden nicht gesendet

**Checklist:**
- [ ] Session Status = "WORKING"
- [ ] WAHA Container läuft
- [ ] Webhook URL korrekt konfiguriert
- [ ] Phone Number Format korrekt (+49...)
- [ ] Rate Limits nicht überschritten

**Debug:**
```bash
# Logs prüfen
# Vercel:
vercel logs --follow

# Railway:
railway logs

# Docker:
docker logs waha -f
```

### Problem: Webhook kommt nicht an

**Webhook testen:**
```bash
# 1. Webhook Endpoint manuell testen
curl -X POST https://yourdomain.com/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message",
    "session": "default",
    "payload": {
      "from": "+491234567890",
      "body": "Test"
    }
  }'

# 2. WAHA Webhook konfigurieren
POST ${WAHA_API_URL}/api/sessions/default/settings
{
  "webhookUrl": "https://yourdomain.com/api/webhooks/whatsapp",
  "webhookEvents": ["message", "message.any"]
}
```

---

## 📊 Health Monitoring

### WAHA Health Check Endpoint erstellen

```typescript
// app/api/health/waha/route.ts
import { NextResponse } from 'next/server'
import { wahaClient } from '@/lib/waha-client'

export async function GET() {
  try {
    const response = await fetch(`${process.env.WAHA_API_URL}/api/server/health`)
    const data = await response.json()

    return NextResponse.json({
      waha: {
        status: response.ok ? 'healthy' : 'unhealthy',
        url: process.env.WAHA_API_URL,
        ...data
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      waha: {
        status: 'unreachable',
        error: error.message
      }
    }, { status: 503 })
  }
}
```

**Usage:**
```bash
# Dashboard Health Check
GET /api/health/waha

# Response:
{
  "waha": {
    "status": "healthy",
    "url": "https://waha-service.railway.app"
  }
}
```

---

## 🔗 WAHA Dokumentation & Resources

### Offizielle Docs
- **WAHA GitHub**: https://github.com/devlikeapro/waha
- **API Docs**: https://waha.devlike.pro/docs
- **Docker Hub**: https://hub.docker.com/r/devlikeapro/waha

### Wichtige WAHA Endpoints
```bash
# Health Check
GET /api/server/health

# Sessions auflisten
GET /api/sessions

# Session erstellen
POST /api/sessions
{
  "name": "default",
  "config": {...}
}

# QR Code
GET /api/sessions/{session}/auth/qr

# Status
GET /api/sessions/{session}/status

# Nachricht senden
POST /api/sendText
{
  "session": "default",
  "chatId": "+123456789",
  "text": "Hello"
}

# Kontakte
GET /api/contacts?session=default

# Nachrichten abrufen
GET /api/messages?session=default&chatId=+123456789
```

---

## ✅ Production Checklist

**Vor Go-Live mit WAHA:**

- [ ] WAHA Service deployed (Railway/Render/Fly.io)
- [ ] WAHA_API_URL korrekt in Production Environment
- [ ] WAHA_API_KEY stark und sicher
- [ ] Health Check funktioniert
- [ ] Session kann erstellt werden
- [ ] QR Code wird angezeigt
- [ ] Nachrichten können gesendet werden
- [ ] Webhook ist konfiguriert
- [ ] Webhook empfängt Events
- [ ] Error Monitoring aktiv (Sentry)
- [ ] Rate Limits konfiguriert

**Test-Flow:**
1. ✅ Session erstellen
2. ✅ QR Code scannen
3. ✅ Test-Nachricht senden
4. ✅ Antwort empfangen (Webhook)
5. ✅ In Dashboard anzeigen

---

## 🚨 Wichtige Hinweise

1. **WAHA API Key**: Niemals im Frontend exposen!
   - ✅ Nur in Backend/API Routes verwenden
   - ✅ In .env.local / Deployment Secrets
   - ❌ NICHT in NEXT_PUBLIC_* Variables

2. **Rate Limiting**: WAHA hat eigene Limits
   - WhatsApp: ~1000 Messages/Tag (persönlich)
   - Business: Höhere Limits
   - Dashboard hat zusätzliche Usage Tracking

3. **Session Management**:
   - Sessions können ablaufen
   - Regelmäßiger Health Check empfohlen
   - Auto-reconnect implementieren (optional)

4. **Webhook Security**:
   - Webhook Signature Verification implementieren
   - IP Allowlist für WAHA Server
   - HTTPS only!

---

## 🔄 Next Steps

1. **WAHA Service deployen** (Railway/Render/Fly.io)
2. **Environment Variables aktualisieren**
3. **Health Check testen**
4. **Erste Session erstellen**
5. **Integration testen**
6. **Production Monitoring aufsetzen**

**Sobald WAHA läuft, ist die komplette WhatsApp Integration einsatzbereit! 🚀**
