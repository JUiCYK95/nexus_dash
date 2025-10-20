---
description: Sicherheits-Audit durchführen
---

Führe ein Sicherheits-Audit für das WhatsApp Dashboard durch:

**Fokus-Bereich**: {{area}}

Überprüfe folgende Aspekte:

1. **Supabase Row Level Security (RLS)**
   - Policies für alle Tabellen
   - organization_id Isolation
   - Benutzer-Rollen und Permissions

2. **API Security**
   - Authentifizierung in API Routes
   - Input-Validierung
   - Rate Limiting (lib/usage-tracker.ts)
   - CORS-Konfiguration

3. **Environment Variables**
   - Sichere Speicherung sensibler Daten
   - Server-only vs. Client-exposed Vars
   - .env.local nicht in Git

4. **WhatsApp Integration**
   - WAHA API Key Sicherheit
   - Webhook-Validierung
   - Session-Management

5. **Frontend Security**
   - XSS-Schutz
   - CSRF-Tokens
   - Sichere Client-Server Kommunikation

Erstelle einen Report mit:
- Gefundene Schwachstellen
- Risiko-Bewertung (Hoch/Mittel/Niedrig)
- Konkrete Lösungsvorschläge
- Best Practices Empfehlungen
