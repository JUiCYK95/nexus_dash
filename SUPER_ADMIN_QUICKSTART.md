# Super Admin - Schnellstart

## Was wurde implementiert?

Eine vollständige Super Admin Lösung zur Verwaltung aller Aspekte Ihrer SaaS-Plattform.

### Hauptfunktionen

1. **Super Admin Dashboard** (`/super-admin`)
   - Übersicht über alle System-Statistiken
   - Schnellzugriff auf alle Verwaltungsbereiche
   - Echtzeitdaten zu Organisationen, Benutzern, Nachrichten

2. **Organisationsverwaltung** (`/super-admin/organizations`)
   - Alle Organisationen anzeigen und durchsuchen
   - Organisationen bearbeiten und löschen
   - Filterung nach Abonnement-Status
   - Details: Plan, Mitglieder, Eigentümer, Trial-Status

3. **Benutzerverwaltung** (`/super-admin/users`)
   - Alle Benutzer anzeigen
   - Super Admin Rechte vergeben/entziehen
   - Benutzer-Organisationen und Rollen anzeigen
   - E-Mail-Bestätigungsstatus und Login-Historie

4. **Datenbank-Features**
   - `super_admins` Tabelle für Zugriffskontrolle
   - `super_admin_logs` für Audit-Trail
   - RLS Policies für sichere Zugriffskontrolle
   - Views für optimierte Abfragen

## Erste Schritte

### Schritt 1: Migration ausführen

Da `psql` nicht verfügbar ist, führen Sie die Migration manuell aus:

1. Öffnen Sie: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt
3. Gehen Sie zu **SQL Editor**
4. Öffnen Sie die Datei: `supabase/migrations/20240120000000_add_super_admin.sql`
5. Kopieren Sie den gesamten Inhalt
6. Fügen Sie ihn in den SQL Editor ein
7. Klicken Sie auf **Run**

### Schritt 2: Super Admin Benutzer erstellen

**Option A: Via Skript (Empfohlen)**

```bash
node scripts/init-super-admin.js
```

Das Skript fragt nach der E-Mail-Adresse und macht den Benutzer zum Super Admin.

**Option B: Manuell via SQL in Supabase**

```sql
-- Ersetzen Sie 'ihre@email.com' mit der tatsächlichen E-Mail
INSERT INTO super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'ihre@email.com';
```

### Schritt 3: Zugriff testen

1. Melden Sie sich mit dem Super Admin Account an
2. Navigieren Sie zu: `http://localhost:3000/super-admin`
3. Sie sollten das Dashboard sehen

## Projektstruktur

```
app/
  super-admin/
    page.tsx                      # Dashboard Übersicht mit Statistiken
    organizations/
      page.tsx                    # Organisationsverwaltung
    users/
      page.tsx                    # Benutzerverwaltung

supabase/
  migrations/
    20240120000000_add_super_admin.sql   # Datenbank-Migration

scripts/
  init-super-admin.js             # Initialisierungs-Skript
```

## Funktionsübersicht

### Dashboard-Statistiken

- **Organisationen Gesamt**: Alle Organisationen im System
- **Aktive Organisationen**: Organisationen mit aktivem Abonnement
- **Trial Organisationen**: Organisationen in der Testphase
- **Benutzer Gesamt**: Alle registrierten Benutzer
- **Aktive Benutzer**: Benutzer mit Organisationsmitgliedschaft
- **Mitgliedschaften**: Gesamtzahl der Organisationsmitgliedschaften
- **Nachrichten/Monat**: Monatliches Nachrichtenvolumen
- **Super Admins**: Anzahl der Super Administratoren

### Organisationsverwaltung

**Ansicht:**
- Tabellarische Übersicht aller Organisationen
- Suchfunktion (Name, Slug, E-Mail)
- Statusfilter (Aktiv, Trial, Gekündigt, Überfällig)

**Informationen pro Organisation:**
- Name und Slug
- Abonnement-Plan (Starter, Professional, Business, Enterprise)
- Abonnement-Status mit farbiger Kennzeichnung
- Anzahl Mitglieder
- Eigentümer E-Mail
- Erstellungsdatum
- Trial-Ablaufdatum (falls zutreffend)

**Aktionen:**
- Bearbeiten (vorbereitet)
- Löschen (mit Bestätigung)

### Benutzerverwaltung

**Ansicht:**
- Tabellarische Übersicht aller Benutzer
- Suchfunktion (E-Mail, Name, Organisation)

**Informationen pro Benutzer:**
- Name und E-Mail
- Zugehörige Organisationen mit Rollen
- Super Admin Status (Shield-Symbol)
- E-Mail-Bestätigungsstatus
- Erstellungsdatum
- Letzter Login

**Aktionen:**
- Super Admin Rechte vergeben/entziehen
- Bearbeiten (vorbereitet)

## Sicherheit

### Mehrschichtige Zugriffskontrolle

1. **Frontend-Prüfung**: Jede Seite prüft Super Admin Status beim Laden
2. **Datenbank-Prüfung**: `is_super_admin()` Funktion prüft Berechtigung
3. **RLS Policies**: Row Level Security verhindert unbefugten Zugriff

### Audit Logging

Alle Super Admin Aktionen werden in `super_admin_logs` protokolliert:

```sql
SELECT
  sal.*,
  u.email as admin_email,
  sal.action,
  sal.target_type,
  sal.created_at
FROM super_admin_logs sal
LEFT JOIN auth.users u ON sal.admin_user_id = u.id
ORDER BY sal.created_at DESC
LIMIT 100;
```

## Häufige Aufgaben

### Super Admin hinzufügen

```bash
node scripts/init-super-admin.js
```

Oder via SQL:
```sql
INSERT INTO super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'neue@email.com';
```

### Super Admin entfernen

Via UI: `/super-admin/users` → Benutzer finden → "Admin entfernen"

Oder via SQL:
```sql
DELETE FROM super_admins WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'email@example.com'
);
```

### Alle Super Admins anzeigen

```sql
SELECT
  sa.*,
  u.email,
  u.created_at as user_created
FROM super_admins sa
JOIN auth.users u ON sa.user_id = u.id
WHERE sa.is_active = true
ORDER BY sa.created_at DESC;
```

### Organisation löschen

Via UI: `/super-admin/organizations` → Organisation → Löschen-Button

Oder via SQL:
```sql
DELETE FROM organizations WHERE id = 'org-uuid';
-- Cascade löscht automatisch alle zugehörigen Daten
```

### Benutzer zu Organisation hinzufügen

```sql
INSERT INTO organization_members (organization_id, user_id, role, joined_at)
VALUES (
  'org-uuid',
  (SELECT id FROM auth.users WHERE email = 'user@email.com'),
  'member',
  NOW()
);
```

## Nächste Entwicklungsschritte

### Geplante Features

1. **Organisations-Editor**
   - Formular zum Erstellen neuer Organisationen
   - Bearbeiten von Organisationsdetails
   - Plan-Upgrades/-Downgrades

2. **Erweiterte Benutzer-Verwaltung**
   - Benutzer-Details bearbeiten
   - Passwort zurücksetzen
   - Benutzer deaktivieren/aktivieren

3. **Analytics Dashboard**
   - Nutzungsstatistiken mit Graphen
   - Trend-Analysen
   - Umsatz-Prognosen

4. **Revenue Dashboard**
   - Stripe-Integration
   - Umsatz-Übersicht
   - Abonnement-Analysen

5. **Audit Log Viewer**
   - Durchsuchbare Logs
   - Filterung nach Aktion, Benutzer, Zeitraum
   - Export-Funktion

6. **Bulk-Operationen**
   - Massen-Bearbeitung von Organisationen
   - Massen-E-Mails
   - Batch-Updates

7. **System-Einstellungen**
   - Globale Konfigurationen
   - Feature Flags
   - Wartungsmodus

## Fehlerbehebung

### Zugriff verweigert

**Problem**: "Sie haben keine Berechtigung, auf diesen Bereich zuzugreifen"

**Lösung**:
1. Prüfen Sie, ob der Benutzer in `super_admins` existiert:
   ```sql
   SELECT * FROM super_admins WHERE user_id = 'user-uuid';
   ```
2. Prüfen Sie `is_active = true`
3. Führen Sie das Init-Skript erneut aus

### Statistiken werden nicht angezeigt

**Problem**: Dashboard zeigt 0 für alle Werte

**Lösung**:
1. Prüfen Sie die View:
   ```sql
   SELECT * FROM super_admin_dashboard_stats;
   ```
2. Prüfen Sie ob Daten vorhanden sind:
   ```sql
   SELECT COUNT(*) FROM organizations;
   SELECT COUNT(*) FROM auth.users;
   ```

### Migration-Fehler

**Problem**: SQL-Fehler beim Ausführen der Migration

**Lösung**:
1. Prüfen Sie ob die Tabellen bereits existieren
2. Löschen Sie ggf. vorhandene Policies:
   ```sql
   DROP POLICY IF EXISTS "policy_name" ON table_name;
   ```
3. Führen Sie die Migration schrittweise aus

## Support & Dokumentation

- **Vollständige Dokumentation**: Siehe `SUPER_ADMIN_SETUP.md`
- **Datenbank-Schema**: Siehe `supabase/migrations/20240120000000_add_super_admin.sql`
- **Entwicklung**: `npm run dev` und öffnen Sie `http://localhost:3000/super-admin`

## Wichtige Hinweise

⚠️ **Sicherheit**:
- Super Admin Zugriff gewährt VOLLSTÄNDIGEN Systemzugriff
- Vergeben Sie Super Admin Rechte nur an vertrauenswürdige Personen
- Alle Aktionen werden geloggt

⚠️ **Produktion**:
- Testen Sie alle Funktionen gründlich in der Entwicklungsumgebung
- Erstellen Sie Backups vor dem Löschen von Organisationen
- Überwachen Sie die `super_admin_logs` Tabelle regelmäßig

⚠️ **Performance**:
- Die Benutzer-Liste lädt alle Benutzer - bei >10.000 Benutzern Pagination implementieren
- Organisationen-View ist optimiert, aber bei sehr vielen Orgs ggf. Pagination hinzufügen

## Erfolg!

Ihr Super Admin Dashboard ist jetzt einsatzbereit! 🎉

Nächste Schritte:
1. ✅ Migration ausführen
2. ✅ Ersten Super Admin erstellen
3. ✅ Dashboard testen
4. ➡️ Weitere Features nach Bedarf implementieren
