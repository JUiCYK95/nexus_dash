# WhatsApp Dashboard - Projektübersicht für Claude Code

## Projektbeschreibung
Ein modernes WhatsApp Business Dashboard mit Real-time Chat, Analytics und Kontakt-Management. Das Projekt nutzt die WAHA (WhatsApp HTTP API) zur Integration mit WhatsApp Business und bietet eine vollständige Chat-Verwaltungslösung.

## Technologie-Stack

### Frontend
- **Framework**: Next.js 15.3.5 (App Router)
- **UI**: React 19, TypeScript
- **Styling**: Tailwind CSS mit Custom Components
- **Icons**: Heroicons, Lucide React
- **Charts**: Recharts für Analytics
- **State Management**: React Context (contexts/)
- **Notifications**: React Hot Toast

### Backend & Services
- **Database**: Supabase (PostgreSQL) mit Row Level Security
- **Authentication**: Supabase Auth mit @supabase/auth-helpers-nextjs
- **WhatsApp API**: WAHA (devlikeapro/waha) über Docker
- **Real-time**: Socket.io Client für Live-Updates
- **Payments**: Stripe Integration für Billing

### Development
- **Sprache**: TypeScript 5.2.2
- **Linting**: ESLint mit Next.js Config
- **Package Manager**: npm

## Projektstruktur

```
/Users/justin/Desktop/Test/
├── app/                      # Next.js App Router Pages
│   ├── dashboard/           # Dashboard Seiten
│   │   ├── analytics/       # Analytics Dashboard
│   │   ├── billing/         # Billing & Subscription
│   │   ├── chat/            # Chat Interface
│   │   ├── contacts/        # Kontakt-Management
│   │   └── settings/        # Einstellungen
│   ├── register/            # Registrierung
│   ├── invite/              # Team Einladungen
│   └── test-org/            # Test-Seite
├── components/              # React Komponenten
│   ├── analytics/           # Analytics Komponenten
│   ├── chat/                # Chat UI (ChatWindow, ChatSidebar)
│   ├── dashboard/           # Dashboard Widgets
│   └── layout/              # Layout Komponenten
├── lib/                     # Utility Libraries
│   ├── supabase*.ts         # Supabase Clients (Server, Admin)
│   ├── waha-client.ts       # WhatsApp API Client
│   ├── stripe*.ts           # Stripe Integration
│   ├── permissions.ts       # Permissions System
│   ├── api-middleware.ts    # API Middleware
│   └── usage-tracker.ts     # Usage Tracking
├── contexts/                # React Context Providers
├── types/                   # TypeScript Type Definitions
├── data/                    # Static Data
├── scripts/                 # Utility Scripts
├── supabase/                # Supabase Config & Migrations
└── .claude/                 # Claude Code Konfiguration

### Konfigurationsdateien
- next.config.js             # Next.js Konfiguration
- tailwind.config.js         # Tailwind CSS Konfiguration
- tsconfig.json              # TypeScript Konfiguration
- supabase-schema.sql        # Datenbank Schema
```

## Wichtige Datenbankschema-Informationen

### Haupttabellen
- **users**: Benutzerprofile mit organization_id und role
- **organizations**: Organisationen/Teams
- **whatsapp_contacts**: WhatsApp Kontakte
- **whatsapp_messages**: Chat-Nachrichten mit Status
- **whatsapp_sessions**: Session-Management für WhatsApp
- **message_analytics**: Aggregierte Statistiken
- **auto_reply_rules**: Automatische Antwortregeln
- **subscriptions**: Stripe Abonnements
- **usage_records**: API Usage Tracking

## API-Endpunkte (Next.js API Routes)

### WhatsApp API
- `/api/whatsapp/send-message` - Nachricht senden
- `/api/whatsapp/qr-code` - QR-Code für Session-Setup
- `/api/whatsapp/session-status` - Status der WhatsApp-Session
- `/api/whatsapp/create-session` - Neue Session erstellen

### Webhooks
- `/api/webhooks/whatsapp` - WhatsApp Event Webhook Handler

## Umgebungsvariablen

Benötigte Environment Variables (.env.local):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=
```

## Entwicklungshinweise

### Lokale Entwicklung
1. WAHA Docker Container starten: `docker run -it --rm -p 3000:3000 devlikeapro/waha`
2. Dev Server: `npm run dev` (läuft auf Port 3000)
3. Alternative Port: `npm run dev -- -p 3001`

### Wichtige Features
- **Real-time Chat**: Socket.io Integration für Live-Updates
- **Analytics**: Detaillierte Message-Statistiken mit Recharts
- **Multi-Tenant**: Organization-basierte Benutzer-Isolation
- **Row Level Security**: Supabase RLS für sichere Daten
- **Stripe Integration**: Subscription & Usage-based Billing
- **Auto-Reply**: Regelbasierte automatische Antworten

### Code-Konventionen
- TypeScript für Type Safety
- Tailwind CSS Utility Classes
- React Server Components wo möglich
- Client Components mit 'use client' Direktive
- Supabase für Auth und Datenbank
- WAHA Client (lib/waha-client.ts) für WhatsApp API

## Bekannte Probleme & Lösungen

Siehe Troubleshooting-Dateien:
- `TROUBLESHOOTING.md` - Allgemeine Probleme
- `TROUBLESHOOTING_BUILD.md` - Build-Probleme
- `TROUBLESHOOTING_STRIPE.md` - Stripe-Integration

## Sicherheit

- Row Level Security (RLS) in Supabase aktiviert
- API Middleware für Authentifizierung
- Service Role Key nur serverseitig
- Input-Validierung auf Frontend und Backend
- Rate Limiting für API-Endpunkte (Usage Tracker)

## Nützliche Befehle

```bash
npm run dev          # Development Server
npm run build        # Production Build
npm run start        # Production Server
npm run lint         # ESLint Check
```

## Externe Services

1. **Supabase**: Database, Auth, Real-time
2. **WAHA**: WhatsApp HTTP API (Docker)
3. **Stripe**: Payment Processing
4. **Socket.io**: Real-time Updates

## Deployment

- Optimiert für Vercel Deployment
- Docker Support vorhanden
- Environment Variables in Deployment-Platform setzen
- WAHA muss separat deployed werden (z.B. auf separatem Server)
