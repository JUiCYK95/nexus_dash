# Super Admin Einrichtung und Verwaltung

Die Super Admin Funktion ermöglicht es, alle Organisationen, Benutzer, Abonnements und System-Einstellungen zentral zu verwalten.

## Ersteinrichtung

### 1. Migration ausführen

Die Super Admin Tabellen und Funktionen wurden bereits in der Migration `20240120000000_add_super_admin.sql` definiert.

Da `psql` nicht verfügbar ist, müssen Sie die Migration manuell in der Supabase SQL Editor ausführen:

1. Öffnen Sie Supabase Dashboard: https://supabase.com/dashboard
2. Gehen Sie zu Ihrem Projekt
3. Navigieren Sie zu **SQL Editor**
4. Öffnen Sie die Datei `supabase/migrations/20240120000000_add_super_admin.sql`
5. Kopieren Sie den gesamten Inhalt
6. Fügen Sie ihn in den SQL Editor ein
7. Klicken Sie auf **Run**

### 2. Super Admin Benutzer erstellen

#### Option A: Via Skript (Empfohlen)

```bash
node scripts/init-super-admin.js
```

Das Skript wird Sie nach der E-Mail-Adresse fragen und den Benutzer automatisch zum Super Admin machen.

#### Option B: Manuell via SQL

Führen Sie in Supabase SQL Editor aus:

```sql
-- Ersetzen Sie 'your@email.com' mit der tatsächlichen E-Mail
INSERT INTO super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'your@email.com';
```

#### Option C: Via User ID

Wenn Sie die User ID bereits kennen:

```sql
INSERT INTO super_admins (user_id) VALUES ('user-uuid-hier');
```

## Super Admin Dashboard

Nach erfolgreicher Einrichtung können Super Admins auf das Dashboard zugreifen:

**URL:** `http://localhost:3000/super-admin`

### Funktionen

#### 1. Dashboard Übersicht (`/super-admin`)
- Gesamtstatistiken des Systems
- Anzahl Organisationen (gesamt, aktiv, trial)
- Anzahl Benutzer (gesamt, aktiv)
- Monatliche Nachrichten
- Super Admin Anzahl
- Schnellzugriff auf alle Verwaltungsbereiche

#### 2. Organisationsverwaltung (`/super-admin/organizations`)
- Alle Organisationen anzeigen
- Nach Name, Slug oder E-Mail suchen
- Nach Abonnement-Status filtern (aktiv, trial, gekündigt, überfällig)
- Organisationen bearbeiten
- Organisationen löschen
- Neue Organisationen erstellen (in Entwicklung)
- Details anzeigen:
  - Name und Slug
  - Abonnement-Plan (Starter, Professional, Business, Enterprise)
  - Abonnement-Status
  - Anzahl Mitglieder
  - Eigentümer E-Mail
  - Erstellungsdatum
  - Trial-Ablaufdatum

#### 3. Benutzerverwaltung (`/super-admin/users`)
- Alle Benutzer anzeigen
- Nach E-Mail, Name oder Organisation suchen
- Benutzerdetails anzeigen:
  - Name und E-Mail
  - Zugehörige Organisationen mit Rollen
  - E-Mail-Bestätigungsstatus
  - Erstellungsdatum
  - Letzter Login
- Super Admin Rechte vergeben/entziehen
- Super Admin Badge für aktive Super Admins

#### 4. Weitere Bereiche (in Planung)
- `/super-admin/subscriptions` - Abonnements verwalten
- `/super-admin/analytics` - Nutzungsstatistiken
- `/super-admin/revenue` - Umsatz-Übersicht
- `/super-admin/activity` - Aktivitätslogs
- `/super-admin/logs` - Audit Logs
- `/super-admin/admins` - Super Admin Verwaltung
- `/super-admin/settings` - System-Einstellungen

## Sicherheit

### Zugriffskontrolle

Der Zugriff auf Super Admin Funktionen ist mehrfach abgesichert:

1. **Frontend-Prüfung**: Jede Super Admin Seite prüft beim Laden, ob der Benutzer ein aktiver Super Admin ist
2. **RLS Policies**: Datenbankzugriff wird durch Row Level Security Policies kontrolliert
3. **is_super_admin() Funktion**: Zentrale Funktion zur Prüfung des Super Admin Status

### Super Admin entfernen

#### Via Benutzeroberfläche
1. Gehen Sie zu `/super-admin/users`
2. Finden Sie den Benutzer
3. Klicken Sie auf "Admin entfernen"

#### Via SQL
```sql
DELETE FROM super_admins WHERE user_id = 'user-uuid-hier';
```

Oder nur deaktivieren:
```sql
UPDATE super_admins SET is_active = false WHERE user_id = 'user-uuid-hier';
```

## Audit Logging

Alle Super Admin Aktionen werden in der `super_admin_logs` Tabelle protokolliert:

```sql
SELECT
  sal.*,
  u.email as admin_email
FROM super_admin_logs sal
LEFT JOIN auth.users u ON sal.admin_user_id = u.id
ORDER BY sal.created_at DESC
LIMIT 50;
```

## Datenbank Views

### `super_admin_dashboard_stats`
Liefert aggregierte Statistiken für das Dashboard:
- Gesamtzahl Organisationen
- Aktive Organisationen
- Trial Organisationen
- Gesamtzahl Benutzer
- Aktive Benutzer
- Gesamtzahl Mitgliedschaften
- Monatliche Nachrichten
- Anzahl Super Admins

### `super_admin_organizations_overview`
Detaillierte Organisationsübersicht mit:
- Alle Organisationsfelder
- Anzahl Mitglieder
- Eigentümer E-Mail

## Häufige Aufgaben

### Neuen Super Admin hinzufügen
```bash
node scripts/init-super-admin.js
# Oder via SQL:
# INSERT INTO super_admins (user_id) SELECT id FROM auth.users WHERE email = 'email@example.com';
```

### Alle Super Admins anzeigen
```sql
SELECT
  sa.*,
  u.email,
  u.created_at as user_created_at
FROM super_admins sa
LEFT JOIN auth.users u ON sa.user_id = u.id
WHERE sa.is_active = true;
```

### Organisation löschen
Über UI: `/super-admin/organizations` → Organisation auswählen → Löschen-Button

Oder via SQL:
```sql
DELETE FROM organizations WHERE id = 'org-uuid-hier';
-- Cascading delete entfernt automatisch alle zugehörigen Daten
```

### Organisationsplan ändern
```sql
UPDATE organizations
SET subscription_plan = 'professional',
    subscription_status = 'active'
WHERE id = 'org-uuid-hier';
```

### Benutzer einer Organisation zuweisen
```sql
INSERT INTO organization_members (organization_id, user_id, role, joined_at)
VALUES (
  'org-uuid-hier',
  'user-uuid-hier',
  'member',  -- oder 'owner', 'admin', 'viewer'
  NOW()
);
```

## Bekannte Einschränkungen

1. **Organisations-Erstellung**: Das Formular zum Erstellen neuer Organisationen ist noch in Entwicklung
2. **Benutzer-Bearbeitung**: Detaillierte Benutzerbearbeitung noch nicht implementiert
3. **Bulk-Operationen**: Massenänderungen noch nicht möglich
4. **Export-Funktionen**: CSV/Excel Export noch nicht verfügbar

## Nächste Schritte

1. Organisations-Erstellungs-/Bearbeitungsformular implementieren
2. Benutzer-Bearbeitungsformular implementieren
3. Analytics Dashboard mit Graphen erstellen
4. Revenue Dashboard mit Stripe Integration
5. Audit Log Viewer implementieren
6. Bulk-Operationen hinzufügen
7. Export-Funktionen implementieren
8. E-Mail-Benachrichtigungen für kritische Ereignisse

## Support

Bei Fragen oder Problemen:
1. Prüfen Sie die Browser-Konsole auf Fehler
2. Prüfen Sie die Supabase Logs
3. Prüfen Sie die `super_admin_logs` Tabelle für Aktivitäten
4. Überprüfen Sie die RLS Policies in Supabase

## Entwicklung

Zum Starten des Development Servers:
```bash
npm run dev
```

Die Super Admin Seiten sind unter `/super-admin/*` verfügbar.

### Projektstruktur
```
app/
  super-admin/
    page.tsx                    # Dashboard Übersicht
    organizations/
      page.tsx                  # Organisationsverwaltung
    users/
      page.tsx                  # Benutzerverwaltung

supabase/
  migrations/
    20240120000000_add_super_admin.sql  # Super Admin Migration

scripts/
  init-super-admin.js          # Initialisierungsskript
```
