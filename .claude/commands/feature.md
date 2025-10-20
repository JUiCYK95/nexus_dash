---
description: Implementiere ein neues Feature
---

Implementiere das folgende neue Feature für das WhatsApp Dashboard:

**Feature**: {{feature_name}}
**Beschreibung**: {{description}}

Gehe dabei wie folgt vor:

1. **Planung**
   - Analysiere bestehende Code-Struktur
   - Definiere benötigte Komponenten
   - Identifiziere Abhängigkeiten
   - Plane Datenbank-Änderungen (falls nötig)

2. **Datenbank** (falls benötigt)
   - Erstelle SQL-Schema-Updates
   - Definiere RLS Policies
   - Berücksichtige organization_id für Multi-Tenancy

3. **Backend**
   - Erstelle/aktualisiere API Routes
   - Implementiere Server-Funktionen
   - Füge Error-Handling hinzu
   - Integriere mit WAHA (falls WhatsApp-Feature)

4. **Frontend**
   - Erstelle React-Komponenten (TypeScript)
   - Implementiere UI mit Tailwind CSS
   - Füge Loading & Error States hinzu
   - Mache es responsive

5. **Testing**
   - Teste Feature manuell
   - Überprüfe Edge Cases
   - Validiere Security

6. **Dokumentation**
   - Update PROJECT.md wenn nötig
   - Füge Code-Kommentare hinzu
   - Dokumentiere API-Endpunkte

Halte dich an die Projekt-Konventionen:
- WhatsApp Green Theme (#22c55e)
- TypeScript für Type Safety
- Supabase für Backend
- Tailwind CSS für Styling
