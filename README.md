# WhatsApp Dashboard

Ein modernes Dashboard für WhatsApp Business mit WAHA API Integration, Analytics und Chat-Management.

## 🚀 Features

- **Benutzerauthentifizierung** mit Supabase
- **Real-time Chat Interface** mit WhatsApp Integration
- **Analytics Dashboard** mit detaillierten KPIs
- **Kontakt-Management** mit Suchfunktion
- **Message Analytics** mit Zeitverlauf
- **Responsive Design** für alle Geräte

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Next.js API Routes
- **WhatsApp API**: WAHA (WhatsApp HTTP API)
- **Charts**: Recharts
- **Styling**: Tailwind CSS mit Custom Components

## 📋 Voraussetzungen

- Node.js 18+ 
- Docker (für WAHA)
- Supabase Account
- WhatsApp Account

## 🔧 Installation

### 1. Repository klonen
\`\`\`bash
git clone <repository-url>
cd whatsapp-dashboard
\`\`\`

### 2. Dependencies installieren
\`\`\`bash
npm install
\`\`\`

### 3. Umgebungsvariablen konfigurieren
\`\`\`bash
cp .env.local.example .env.local
# Bearbeiten Sie .env.local mit Ihren Werten
\`\`\`

### 4. Supabase Database Setup
\`\`\`bash
# Schema in Supabase ausführen
# Kopieren Sie den Inhalt aus supabase-schema.sql in Ihr Supabase SQL Editor
\`\`\`

### 5. WAHA Docker Container starten
\`\`\`bash
docker run -it --rm \\
  -p 3000:3000 \\
  -e WHATSAPP_SWAGGER_ENABLED=true \\
  --name waha \\
  devlikeapro/waha
\`\`\`

### 6. Entwicklungsserver starten
\`\`\`bash
npm run dev -- -p 3001
\`\`\`

## 🔑 Umgebungsvariablen

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# WAHA API
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=optional_api_key

# Next.js
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_random_secret_key
\`\`\`

## 📱 WhatsApp Setup

1. Gehen Sie zu `/dashboard/settings`
2. Klicken Sie auf "Neue Session erstellen"
3. Klicken Sie auf "QR-Code abrufen"
4. Scannen Sie den QR-Code mit WhatsApp
5. Die Verbindung sollte erfolgreich hergestellt werden

## 🚀 Deployment

### Vercel Deployment
\`\`\`bash
# Vercel CLI installieren
npm i -g vercel

# Projekt deployen
vercel

# Umgebungsvariablen in Vercel Dashboard setzen
\`\`\`

### Docker Deployment
\`\`\`bash
# Dockerfile erstellen und Container bauen
docker build -t whatsapp-dashboard .
docker run -p 3001:3001 whatsapp-dashboard
\`\`\`

## 📊 Datenbankschema

Das vollständige Schema finden Sie in \`supabase-schema.sql\`:

- **users**: Benutzerprofile und Authentifizierung
- **whatsapp_contacts**: WhatsApp-Kontakte
- **whatsapp_messages**: Nachrichtenverlauf
- **whatsapp_sessions**: Session-Management
- **message_analytics**: Aggregierte Statistiken
- **auto_reply_rules**: Automatische Antwortregeln

## 🔧 API Endpoints

### WhatsApp API
- \`POST /api/whatsapp/send-message\` - Nachricht senden
- \`GET /api/whatsapp/qr-code\` - QR-Code abrufen
- \`GET /api/whatsapp/session-status\` - Session-Status
- \`POST /api/whatsapp/create-session\` - Neue Session erstellen

### Webhooks
- \`POST /api/webhooks/whatsapp\` - WhatsApp Webhook Handler

## 🎨 Design System

Das Dashboard verwendet ein modernes Design System mit:

- **WhatsApp-Farbpalette**: #22c55e (Primary), #16a34a (Dark)
- **Responsive Grid System**: Tailwind CSS
- **Moderne Komponenten**: Cards, Charts, Modals
- **Dark Mode Support**: Vorbereitet für Dunkelmodus

## 🔒 Sicherheit

- **Row Level Security (RLS)** in Supabase aktiviert
- **Sichere API-Endpunkte** mit Authentifizierung
- **Umgebungsvariablen** für sensible Daten
- **Input-Validierung** auf Frontend und Backend

## 📈 Monitoring

- **Real-time Analytics** für Nachrichten
- **Performance-Metriken** für Antwortzeiten
- **Benutzer-Aktivitäts-Tracking**
- **Error-Logging** für Debugging

## 🤝 Beitrag

1. Fork das Repository
2. Erstellen Sie einen Feature-Branch
3. Committen Sie Ihre Änderungen
4. Erstellen Sie einen Pull Request

## 📄 Lizenz

MIT License - siehe LICENSE-Datei für Details.

## 🆘 Support

Bei Fragen oder Problemen:

1. Überprüfen Sie die Logs in der Browser-Konsole
2. Prüfen Sie die WAHA-Container-Logs: \`docker logs waha\`
3. Überprüfen Sie die Supabase-Logs im Dashboard
4. Erstellen Sie ein Issue in diesem Repository

## 🔄 Updates

Um das Dashboard zu aktualisieren:

\`\`\`bash
git pull origin main
npm install
npm run build
\`\`\`