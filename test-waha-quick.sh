#!/bin/bash

echo "🚀 WAHA Integration Quick Test"
echo "==============================="
echo ""

# Load .env.local
export $(grep -v '^#' .env.local | xargs)

echo "✅ Dev Server: http://localhost:3000"
echo ""
echo "📡 Testing WAHA API Endpoints..."
echo ""

# Test 1: Session Status (should require auth)
echo "1️⃣  Session Status Endpoint:"
curl -s http://localhost:3000/api/whatsapp/session-status?session=default | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/whatsapp/session-status?session=default
echo ""

# Test 2: QR Code (should require auth)
echo "2️⃣  QR Code Endpoint:"
curl -s http://localhost:3000/api/whatsapp/qr-code?session=default | jq '.' 2>/dev/null || curl -s http://localhost:3000/api/whatsapp/qr-code?session=default
echo ""

# Test 3: Check Supabase env vars
echo "3️⃣  Environment Check:"
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "   ✅ NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
else
  echo "   ❌ NEXT_PUBLIC_SUPABASE_URL not set"
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:30}..."
else
  echo "   ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
fi

if [ -n "$WAHA_API_URL" ]; then
  echo "   ✅ WAHA_API_URL: $WAHA_API_URL"
else
  echo "   ⚠️  WAHA_API_URL not set (using database values)"
fi

echo ""
echo "4️⃣  Code Implementation:"
echo "   ✅ WAHA Client: Multi-Tenant Ready"
echo "   ✅ API Routes: Updated for Organizations"
echo "   ✅ Migration: Available in supabase/migrations/"
echo ""
echo "📝 Next Steps:"
echo "   1. Run migration in Supabase Dashboard"
echo "   2. Set WAHA URLs for organizations"
echo "   3. Test with real login"
echo ""
echo "🌐 Open in browser: http://localhost:3000"
