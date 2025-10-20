# E-Mail-Konfiguration für Team-Einladungen

Die Anwendung kann jetzt E-Mails für Team-Einladungen versenden. Ohne SMTP-Konfiguration werden die Einladungen nur in der Server-Konsole angezeigt.

## SMTP-Einstellungen konfigurieren

### Option 1: Gmail (empfohlen für Entwicklung)

1. **App-Passwort erstellen:**
   - Gehen Sie zu https://myaccount.google.com/apppasswords
   - Melden Sie sich mit Ihrem Google-Konto an
   - Klicken Sie auf "App-Passwort erstellen"
   - Wählen Sie "Mail" und "Sonstiges Gerät"
   - Kopieren Sie das generierte 16-stellige Passwort

2. **Umgebungsvariablen in `.env.local` setzen:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=ihre-email@gmail.com
   SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Das App-Passwort von Schritt 1
   SMTP_FROM_NAME="Ihr Firmenname"
   ```

### Option 2: Andere E-Mail-Anbieter

#### Outlook/Office 365
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ihre-email@outlook.com
SMTP_PASSWORD=ihr-passwort
SMTP_FROM_NAME="Ihr Firmenname"
```

#### Amazon SES
```bash
SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=Ihr-SMTP-Benutzername
SMTP_PASSWORD=Ihr-SMTP-Passwort
SMTP_FROM_NAME="Ihr Firmenname"
```

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=Ihr-SendGrid-API-Key
SMTP_FROM_NAME="Ihr Firmenname"
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@ihre-domain.mailgun.org
SMTP_PASSWORD=Ihr-Mailgun-Passwort
SMTP_FROM_NAME="Ihr Firmenname"
```

## E-Mail-Konfiguration testen

Die Anwendung enthält ein Test-Skript, um die E-Mail-Konfiguration zu überprüfen:

```bash
# Erstellen Sie eine Testdatei
cat > test-email.js << 'EOF'
const { verifyEmailConfig } = require('./lib/email')

async function test() {
  const result = await verifyEmailConfig()
  console.log('E-Mail-Konfiguration:', result)
}

test()
EOF

# Führen Sie den Test aus
node test-email.js
```

## So funktioniert es

1. **Ohne SMTP-Konfiguration:**
   - Einladungen werden nur in der Server-Konsole geloggt
   - Der Einladungslink wird angezeigt
   - Sie können den Link manuell kopieren und an den Benutzer senden

2. **Mit SMTP-Konfiguration:**
   - Einladungen werden automatisch per E-Mail versendet
   - Der Benutzer erhält eine professionell formatierte HTML-E-Mail
   - Die E-Mail enthält einen direkten Link zur Einladung
   - Einladungen laufen nach 7 Tagen ab

## E-Mail-Template

Die Einladungs-E-Mail enthält:
- Einen einladenden Betreff
- Den Namen der Organisation
- Die zugewiesene Rolle (Besitzer, Admin, Mitglied, Betrachter)
- Einen Call-to-Action-Button zum Akzeptieren
- Den vollständigen Einladungslink als Alternative
- Ein Ablaufdatum (7 Tage)
- Responsive Design für mobile Geräte

## Fehlerbehebung

### E-Mails werden nicht gesendet

1. **Überprüfen Sie die SMTP-Anmeldedaten:**
   ```bash
   # In der .env.local-Datei
   echo $SMTP_USER
   echo $SMTP_PASSWORD
   ```

2. **Prüfen Sie die Server-Logs:**
   - Öffnen Sie das Terminal, in dem `npm run dev` läuft
   - Suchen Sie nach E-Mail-bezogenen Fehlermeldungen

3. **Häufige Probleme:**
   - **Gmail:** Verwenden Sie ein App-Passwort, nicht Ihr normales Passwort
   - **2FA aktiviert:** App-Passwörter sind erforderlich
   - **Firewall:** Port 587 muss geöffnet sein
   - **Falsche Anmeldedaten:** Überprüfen Sie Benutzername und Passwort

### E-Mails landen im Spam

1. Verwenden Sie einen verifizierten E-Mail-Dienst (z.B. SendGrid, Mailgun)
2. Konfigurieren Sie SPF und DKIM-Einträge für Ihre Domain
3. Verwenden Sie eine professionelle Absender-Adresse

## Produktions-Empfehlungen

Für den Produktionseinsatz empfehlen wir:

1. **Transaktions-E-Mail-Dienst verwenden:**
   - SendGrid (12.000 kostenlose E-Mails/Monat)
   - Mailgun (5.000 kostenlose E-Mails/Monat)
   - Amazon SES (sehr günstig, erfordert AWS-Konto)

2. **E-Mail-Tracking implementieren:**
   - Öffnungsraten verfolgen
   - Klicks auf Links tracken
   - Bounces und Fehler protokollieren

3. **Eigene Domain verwenden:**
   - noreply@ihre-firma.de statt Gmail
   - SPF und DKIM konfigurieren
   - DMARC-Richtlinie einrichten

## Sicherheitshinweise

- ⚠️ Speichern Sie SMTP-Anmeldedaten **NIE** in Git
- ⚠️ Verwenden Sie Umgebungsvariablen (`.env.local`)
- ⚠️ Für Gmail: Verwenden Sie immer App-Passwörter
- ⚠️ Aktivieren Sie 2FA für Ihre E-Mail-Konten
- ⚠️ Rotieren Sie Passwörter regelmäßig

## Weitere Informationen

- [Nodemailer Dokumentation](https://nodemailer.com/)
- [Gmail App-Passwörter](https://support.google.com/accounts/answer/185833)
- [SendGrid Setup](https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api)
