#!/bin/bash

echo "🚀 WhatsApp Dashboard Setup Script"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js ist nicht installiert. Bitte installieren Sie Node.js 18+"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ist nicht installiert. Bitte installieren Sie Docker"
    exit 1
fi

echo "✅ Voraussetzungen erfüllt"

# Install dependencies
echo "📦 Installiere Dependencies..."
npm install

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local nicht gefunden. Erstelle aus Beispieldatei..."
    cp .env.local.example .env.local
    echo "📝 Bitte bearbeiten Sie .env.local mit Ihren echten Werten"
fi

# Start WAHA container
echo "🐳 Starte WAHA Docker Container..."
docker run -d \
  --name waha-whatsapp \
  -p 3000:3000 \
  -e WHATSAPP_SWAGGER_ENABLED=true \
  -e WHATSAPP_SWAGGER_USERNAME=admin \
  -e WHATSAPP_SWAGGER_PASSWORD=admin \
  --restart unless-stopped \
  devlikeapro/waha

# Wait for WAHA to be ready
echo "⏳ Warte auf WAHA startup..."
sleep 10

# Check if WAHA is running
if curl -f http://localhost:3000/api/health &> /dev/null; then
    echo "✅ WAHA ist erfolgreich gestartet"
else
    echo "❌ WAHA konnte nicht gestartet werden"
    exit 1
fi

echo ""
echo "🎉 Setup abgeschlossen!"
echo ""
echo "Nächste Schritte:"
echo "1. Bearbeiten Sie .env.local mit Ihren Supabase-Credentials"
echo "2. Führen Sie das Datenbank-Schema in Supabase aus"
echo "3. Starten Sie den Entwicklungsserver: npm run dev -- -p 3001"
echo "4. Öffnen Sie http://localhost:3001 im Browser"
echo ""
echo "WAHA Swagger UI: http://localhost:3000"
echo "WAHA Credentials: admin / admin"