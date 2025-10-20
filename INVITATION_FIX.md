# Fix: Einladungen bei Registrierung

## Problem

Wenn ein Benutzer sich mit einer eingeladenen E-Mail-Adresse registriert, wird durch den `create_org_on_signup` Trigger automatisch eine neue Organisation erstellt, anstatt die bestehende Einladung zu akzeptieren und den Benutzer zur eingeladenen Organisation hinzuzufügen.

## Lösung

Die Lösung besteht aus zwei Teilen:

### 1. Verbesserter Trigger

Der Trigger wurde so angepasst, dass er **zuerst** nach bestehenden Einladungen sucht, bevor er eine neue Organisation erstellt.

**Neue Logik:**
1. Prüfe ob eine ausstehende Einladung für die E-Mail-Adresse existiert
2. Wenn ja: Füge den Benutzer zur eingeladenen Organisation hinzu
3. Wenn nein: Erstelle wie bisher eine neue Organisation

### 2. Status-Tracking für Einladungen

Einladungen haben jetzt einen `status` Feld:
- `pending` - Einladung ausstehend
- `accepted` - Einladung angenommen
- `declined` - Einladung abgelehnt
- `expired` - Einladung abgelaufen

## Migration ausführen

Die Migration `20240121000000_fix_invitation_signup.sql` muss in Supabase ausgeführt werden:

### Option 1: Supabase Dashboard (Empfohlen)

1. Öffnen Sie: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt
3. Gehen Sie zu **SQL Editor**
4. Öffnen Sie die Datei: `supabase/migrations/20240121000000_fix_invitation_signup.sql`
5. Kopieren Sie den gesamten Inhalt
6. Fügen Sie ihn in den SQL Editor ein
7. Klicken Sie auf **Run**

### Option 2: Manuell via psql (Falls verfügbar)

```bash
psql "postgresql://postgres.ijbrtnxhtojmnfavhrpx:Quatar2029@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/20240121000000_fix_invitation_signup.sql
```

## Was die Migration macht

### 1. Löscht alte Funktion und Trigger
```sql
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_organization_for_user();
```

### 2. Erstellt verbesserte Funktion

Die neue `create_organization_for_user()` Funktion:

```sql
-- Prüft auf bestehende Einladungen
SELECT * INTO pending_invitation
FROM organization_invitations
WHERE LOWER(email) = LOWER(NEW.email)
  AND status = 'pending'
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1;

-- Wenn Einladung existiert: Benutzer hinzufügen
IF pending_invitation.id IS NOT NULL THEN
  INSERT INTO organization_members (...)
  VALUES (...);

  UPDATE organization_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = pending_invitation.id;

  RETURN NEW;
END IF;

-- Sonst: Neue Organisation erstellen (wie bisher)
```

### 3. Fügt Status-Spalte hinzu

Falls noch nicht vorhanden, wird die `status` Spalte zur `organization_invitations` Tabelle hinzugefügt.

### 4. Neue Hilfsfunktionen

**accept_organization_invitation(token)**
- Für existierende Benutzer zum manuellen Akzeptieren
- Prüft Gültigkeit der Einladung
- Fügt Benutzer zur Organisation hinzu
- Markiert Einladung als akzeptiert

**decline_organization_invitation(token)**
- Zum Ablehnen einer Einladung
- Markiert Einladung als abgelehnt

**expire_old_invitations()**
- Zum Bereinigen abgelaufener Einladungen
- Kann manuell oder per Cron-Job ausgeführt werden

## Wie es jetzt funktioniert

### Szenario 1: Neuer Benutzer mit Einladung

1. Admin sendet Einladung an `neuer@user.com`
2. Benutzer erhält E-Mail mit Einladungslink
3. Benutzer klickt auf Link → `/invite/[token]`
4. Benutzer klickt auf "Jetzt registrieren"
5. Benutzer füllt Registrierungsformular aus
6. **NEU**: Trigger erkennt die Einladung automatisch
7. Benutzer wird der eingeladenen Organisation hinzugefügt
8. **KEINE** neue Organisation wird erstellt
9. Benutzer landet direkt im Dashboard der Organisation

### Szenario 2: Existierender Benutzer mit Einladung

1. Admin sendet Einladung an `existing@user.com`
2. Benutzer erhält E-Mail mit Einladungslink
3. Benutzer klickt auf Link → `/invite/[token]`
4. Benutzer ist bereits angemeldet
5. Benutzer klickt auf "Einladung annehmen"
6. System ruft `accept_organization_invitation()` auf
7. Benutzer wird der Organisation hinzugefügt
8. Benutzer landet im Dashboard

### Szenario 3: Normaler Benutzer ohne Einladung

1. Benutzer geht zu Registrierungsseite
2. Benutzer füllt Formular aus
3. Trigger findet **keine** Einladung
4. Neue Organisation wird erstellt (wie bisher)
5. Benutzer wird Owner der neuen Organisation

## Testing

### Test 1: Einladung → Registrierung

```bash
# 1. Einladung erstellen (via UI oder SQL)
INSERT INTO organization_invitations (organization_id, email, role, invited_by, token, expires_at)
VALUES (
  'existing-org-id',
  'test@example.com',
  'member',
  'admin-user-id',
  'test-token-123',
  NOW() + INTERVAL '7 days'
);

# 2. Neuen Account mit test@example.com registrieren

# 3. Prüfen ob Benutzer zur Organisation hinzugefügt wurde
SELECT * FROM organization_members
WHERE user_id = 'new-user-id'
AND organization_id = 'existing-org-id';

# 4. Prüfen ob Einladung akzeptiert wurde
SELECT status FROM organization_invitations
WHERE token = 'test-token-123';
-- Sollte 'accepted' sein

# 5. Prüfen ob KEINE neue Organisation erstellt wurde
SELECT COUNT(*) FROM organizations
WHERE slug LIKE 'test%';
-- Sollte 0 oder gleichgeblieben sein
```

### Test 2: Einladung → Existierender Benutzer

```bash
# 1. Mit existierendem Account anmelden

# 2. Einladungslink öffnen: /invite/test-token-123

# 3. "Einladung annehmen" klicken

# 4. Prüfen ob zur Organisation hinzugefügt
SELECT * FROM organization_members
WHERE user_id = auth.uid()
AND organization_id = 'existing-org-id';
```

### Test 3: Normale Registrierung

```bash
# 1. Registrierung OHNE Einladung

# 2. Prüfen ob neue Organisation erstellt wurde
SELECT * FROM organizations
WHERE slug LIKE '%new-user%';

# 3. Prüfen ob Benutzer Owner ist
SELECT role FROM organization_members
WHERE user_id = 'new-user-id';
-- Sollte 'owner' sein
```

## Rollback (Falls nötig)

Falls die neue Funktion Probleme verursacht, können Sie zur alten Version zurückkehren:

```sql
-- Alte Funktion wiederherstellen
CREATE OR REPLACE FUNCTION create_organization_for_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  org_slug TEXT;
BEGIN
  -- Generate a unique slug from email
  org_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));

  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
    org_slug := org_slug || '-' || FLOOR(RANDOM() * 1000)::TEXT;
  END LOOP;

  -- Create organization
  INSERT INTO organizations (name, slug, subscription_plan, trial_ends_at)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)) || '''s Organization',
    org_slug,
    'starter',
    NOW() + INTERVAL '14 days'
  )
  RETURNING id INTO org_id;

  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role, joined_at)
  VALUES (org_id, NEW.id, 'owner', NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger neu erstellen
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;
CREATE TRIGGER create_org_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_organization_for_user();
```

## Bekannte Einschränkungen

1. **Case-Sensitivity**: E-Mail-Adressen werden nicht case-sensitiv verglichen (`LOWER()` wird verwendet)
2. **Mehrere Einladungen**: Wenn mehrere ausstehende Einladungen existieren, wird die neueste verwendet
3. **E-Mail-Bestätigung**: Die automatische Zuweisung erfolgt auch bei unbestätigten E-Mails

## Häufige Probleme

### Problem: Benutzer wird immer noch neuer Organisation zugewiesen

**Lösung**:
1. Prüfen Sie ob die Migration erfolgreich ausgeführt wurde
2. Prüfen Sie ob die Einladung `status = 'pending'` hat
3. Prüfen Sie ob die Einladung noch nicht abgelaufen ist
4. E-Mail-Adressen müssen exakt übereinstimmen (ignoriert Groß-/Kleinschreibung)

```sql
-- Einladung prüfen
SELECT * FROM organization_invitations
WHERE LOWER(email) = LOWER('user@example.com')
AND status = 'pending'
AND expires_at > NOW();
```

### Problem: Einladung kann nicht akzeptiert werden

**Lösung**:
1. Prüfen Sie ob der Token gültig ist
2. Prüfen Sie ob die Einladung nicht abgelaufen ist
3. Prüfen Sie ob der Benutzer nicht bereits Mitglied ist

```sql
-- Token prüfen
SELECT * FROM organization_invitations
WHERE token = 'your-token-here';

-- Mitgliedschaft prüfen
SELECT * FROM organization_members
WHERE user_id = 'user-id'
AND organization_id = 'org-id';
```

## Überwachung

### Einladungs-Statistiken

```sql
-- Ausstehende Einladungen
SELECT COUNT(*) as pending
FROM organization_invitations
WHERE status = 'pending' AND expires_at > NOW();

-- Akzeptierte Einladungen (heute)
SELECT COUNT(*) as accepted_today
FROM organization_invitations
WHERE status = 'accepted'
AND DATE(accepted_at) = CURRENT_DATE;

-- Abgelaufene Einladungen
SELECT COUNT(*) as expired
FROM organization_invitations
WHERE status = 'pending' AND expires_at < NOW();
```

### Aufräumen

```sql
-- Abgelaufene Einladungen markieren
SELECT expire_old_invitations();

-- Alte Einladungen löschen (älter als 30 Tage)
DELETE FROM organization_invitations
WHERE created_at < NOW() - INTERVAL '30 days'
AND status IN ('accepted', 'declined', 'expired');
```

## Empfehlungen

1. **Regelmäßige Bereinigung**: Führen Sie `expire_old_invitations()` täglich aus
2. **Monitoring**: Überwachen Sie ausstehende Einladungen
3. **E-Mail-Benachrichtigungen**: Implementieren Sie Erinnerungen für ausstehende Einladungen
4. **Ablaufdatum**: Standard ist 7 Tage - passen Sie bei Bedarf an

## Zusammenfassung

✅ **Behobenes Problem**: Neue Benutzer mit Einladungen werden jetzt korrekt der eingeladenen Organisation zugewiesen

✅ **Neue Features**:
- Automatische Einladungs-Erkennung bei Registrierung
- Status-Tracking für Einladungen
- Hilfsfunktionen zum Akzeptieren/Ablehnen
- Funktion zum Bereinigen abgelaufener Einladungen

✅ **Abwärtskompatibilität**: Normale Registrierungen ohne Einladung funktionieren wie bisher

✅ **Sicherheit**: Alle Prüfungen (Ablaufdatum, E-Mail-Match, Duplikate) bleiben bestehen
