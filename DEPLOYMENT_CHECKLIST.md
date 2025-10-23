# Deployment Checklist

## Pre-Deployment (Vor jedem Production Deploy)

### 1. Code Review
- [ ] Code wurde reviewed
- [ ] Keine console.logs oder Debug-Code im Production-Code
- [ ] Alle TODOs sind dokumentiert

### 2. Testing
- [ ] Alle Unit-Tests bestanden
- [ ] Integration-Tests bestanden
- [ ] Manuelle Tests in Development durchgeführt
- [ ] API-Endpunkte mit Postman/Insomnia getestet
- [ ] UI-Funktionalität in allen unterstützten Browsern getestet

### 3. Security
- [ ] Keine Secrets oder API-Keys im Code committed
- [ ] Environment-Variablen in .env.local konfiguriert
- [ ] CSRF-Protection getestet (falls aktiviert)
- [ ] Rate-Limiting funktioniert korrekt
- [ ] SQL-Injection-Schutz verifiziert
- [ ] XSS-Schutz vorhanden

### 4. Database
- [ ] Migrations getestet in Development
- [ ] Backup der Production-Datenbank erstellt
- [ ] Rollback-Plan vorhanden
- [ ] Foreign Keys und Constraints geprüft

### 5. Performance
- [ ] Build läuft ohne Fehler (`npm run build`)
- [ ] Keine Performance-Warnungen
- [ ] Lighthouse Score überprüft
- [ ] API-Response-Zeiten akzeptabel

### 6. Feature Flags
- [ ] Neue Features sind hinter Feature Flags
- [ ] Feature Flags in `lib/feature-flags.ts` konfiguriert
- [ ] Graduelle Rollout-Strategie definiert

## Deployment Process

### 1. Staging Deployment (wenn vorhanden)
- [ ] Deploy auf Staging
- [ ] Funktionalität auf Staging testen
- [ ] Smoke-Tests durchführen
- [ ] 24h auf Staging laufen lassen

### 2. Production Deployment
- [ ] Off-Peak Zeit gewählt (z.B. nachts oder Wochenende)
- [ ] Team benachrichtigt
- [ ] Monitoring aktiv
- [ ] Rollback-Button bereit

### 3. Monitoring während Deployment
- [ ] Error-Rate überwachen
- [ ] Response-Times überwachen
- [ ] User-Feedback überwachen
- [ ] Logs in Echtzeit prüfen

## Post-Deployment

### 1. Verification (Erste 15 Minuten)
- [ ] Kritische User-Flows testen (Login, Dashboard, Messaging)
- [ ] API-Health-Check erfolgreich
- [ ] Keine kritischen Errors in Logs
- [ ] Supabase-Verbindung funktioniert

### 2. Monitoring (Erste 24 Stunden)
- [ ] Error-Rate normal (< 1%)
- [ ] Response-Times normal (< 2s)
- [ ] Keine User-Beschwerden
- [ ] Database-Performance normal

### 3. Rollback Triggers
Sofortiger Rollback wenn:
- [ ] Error-Rate > 5%
- [ ] Kritische Funktionalität nicht verfügbar
- [ ] Datenverlust erkannt
- [ ] Security-Breach vermutet

## Rollback Process

### Wenn etwas schief geht:
1. **Sofort:** `git revert HEAD && git push`
2. **Database:** Migrations rückgängig machen (siehe Backup)
3. **Vercel/Hosting:** Previous Deployment wiederherstellen
4. **Kommunikation:** Team und betroffene User informieren
5. **Post-Mortem:** Incident dokumentieren und analysieren

## Critical Features (NIEMALS ohne Tests deployen)

- [ ] Authentication/Authorization
- [ ] Payment/Billing
- [ ] Data Migration
- [ ] Security Features (CSRF, Rate Limiting)
- [ ] Database Schema Changes

## Notes

- Niemals direkt auf Production deployen ohne Testing
- Immer Feature Flags für neue Features verwenden
- Bei Unsicherheit: Lieber einen Tag warten und testen
- "Move fast and break things" gilt NICHT für Production!
